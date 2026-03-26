# Agent Interaction & Streaming Implementation

This document describes how the LangGraph ReAct agent works end-to-end: from a user message arriving at the API through tool execution and token streaming all the way to the rendered frontend response.

---

## Architecture Overview

```
User types message
       │
       ▼
┌──────────────┐   POST /api/chat/stream   ┌─────────────────────┐
│  Chat.jsx    │ ────────────────────────> │  chat.py (router)   │
│  (frontend)  │                           │  StreamingResponse  │
└──────────────┘                           └──────────┬──────────┘
       ▲                                              │
       │                                              ▼
       │                                   ┌──────────────────────┐
       │                                   │  agent_streaming.py  │
       │                                   │  astream_events()    │
       │                                   └──────────┬───────────┘
       │                                              │
       │          SSE (text/event-stream)             ▼
       │   ◄──────────────────────────────  ┌──────────────────────┐
       │   event: token / tool_start /       │     agent.py         │
       │   tool_result / widget /            │  LangGraph StateGraph│
       │   message_start / message_end       │                      │
       │                                     │  ┌───────┐           │
       └─────────────────────────────────    │  │ agent │ ◄─┐       │
         api.js parses SSE, fires callbacks  │  │ node  │   │loop   │
                                             │  └───┬───┘   │       │
                                             │      │        │       │
                                             │  has tool     │       │
                                             │  calls?       │       │
                                             │      │        │       │
                                             │      ▼        │       │
                                             │  ┌───────┐    │       │
                                             │  │ tools │ ───┘       │
                                             │  │ node  │            │
                                             │  └───────┘            │
                                             └──────────────────────┘
```

---

## The LangGraph Agent (`agent.py`)

### State

The agent maintains a typed state dictionary across each turn:

```python
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]  # full conversation
    session_id: str
    tool_calls: list[dict]  # tool calls made this turn
```

`add_messages` is a LangGraph reducer that appends new messages rather than replacing the list, so conversation context accumulates automatically.

### Graph Structure

```
START ──► agent node ──► should_continue ──► "continue" ──► tools node ──┐
                                  │                                        │
                                  └──► "end" ──► END           loop back ─┘
                                                                to agent
```

The graph is a cycle: the agent LLM runs, optionally requests tools, tools run and return results, then the agent runs again with the updated messages. This continues until the LLM produces a response with no tool calls, at which point `should_continue` returns `"end"`.

### Agent Node

```python
async def agent_node(state, llm_with_tools):
    response = await llm_with_tools.ainvoke(state["messages"])
    return {"messages": [response], "tool_calls": response.tool_calls or []}
```

The LLM is a `ChatOpenAI` instance with `streaming=True` and tools bound via `llm.bind_tools(tools)`. Binding tools injects the tool schemas into the system prompt automatically so the model knows when and how to call them.

### Tools Node

```python
def tool_node(state, tools):
    for tool_call in last_message.tool_calls:
        result = tool_func.invoke(tool_args)
        tool_results.append(ToolMessage(content=result, tool_call_id=tool_call["id"]))
    return {"messages": tool_results}
```

Each `ToolMessage` is appended to the state and becomes part of the conversation history the agent receives on its next iteration.

### Built-in Tools

| Tool | Description |
|------|-------------|
| `get_current_time` | Returns the current date and time |
| `query_knowledge_base` | Semantic search against the configured RAG endpoint |

`query_knowledge_base` returns a JSON envelope with two keys:
- `context` — plain text forwarded to the LLM as the tool result
- `sources` — structured list used to emit a frontend `widget` event

---

## Streaming Layer (`agent_streaming.py`)

`stream_chat_response` wraps `graph.astream_events(..., version="v2")` and translates LangGraph's internal event stream into SSE-formatted strings.

### LangGraph → SSE Event Mapping

| LangGraph event | SSE event emitted |
|-----------------|-------------------|
| (start of call) | `message_start` |
| `on_chat_model_stream` (chunk has content) | `token` |
| `on_tool_start` | `tool_start` |
| `on_tool_end` (plain result) | `tool_result` |
| `on_tool_end` (JSON with `context` key) | `widget` then `tool_result` |
| (generator exhausted normally) | `message_end` |
| exception | `error` |

### Widget Detection

When a tool result is valid JSON containing a `"context"` key, the streaming layer:
1. Extracts `context` and uses it as the `tool_result` payload (what the LLM and the tool sidebar show)
2. Emits a `widget` event with the remaining structured fields so the frontend can render a rich component

```python
result_data = json.loads(result_str)
if "context" in result_data:
    display_result = result_data["context"]        # → tool_result event
    if tool_name == "query_knowledge_base":
        yield f"event: widget\ndata: {json.dumps({...})}\n\n"  # → widget event
yield f"event: tool_result\ndata: {json.dumps({'tool': tool_name, 'result': display_result})}\n\n"
```

---

## SSE Event Reference

All events use the SSE wire format: each message is two header lines followed by a blank line.

```
event: <name>
data: <json>

```

### `message_start`

Fired once when the stream opens.

```json
{ "session_id": "550e8400-e29b-41d4-a716-446655440000" }
```

### `token`

One fragment of LLM output text. Accumulate these to build the full response.

```json
{ "token": "The current time is " }
```

### `tool_start`

LLM has requested one or more tools. The UI shows a "tool running" indicator.

```json
{ "tools": [{ "name": "get_current_time", "args": {} }] }
```

### `tool_result`

Tool execution finished. `result` is always a human-readable string.

```json
{ "tool": "get_current_time", "result": "The current date and time is: Friday, March 27, 2026 at 09:30 AM" }
```

### `widget`

Emitted before `tool_result` when a tool returns rich structured data. The `type` field determines which React component renders it.

```json
{
  "type": "knowledge_base_results",
  "query": "refund policy",
  "total": 3,
  "sources": [
    { "rank": 1, "content": "...", "source": "policy.pdf", "score": 0.91, "author": "", "date": "", "category": "" }
  ]
}
```

### `message_end`

Stream complete. Contains the full concatenated response for persistence.

```json
{
  "full_message": "The current time is 9:30 AM...",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "tool_calls": [{ "name": "get_current_time", "args": {} }]
}
```

### `error`

Unrecoverable error during streaming.

```json
{ "error": "Connection to LLM provider timed out" }
```

---

## Router (`chat.py`)

The `/api/chat/stream` endpoint returns a `StreamingResponse` wrapping an async generator. It deliberately does **not** use FastAPI's `Depends(get_db)` — dependency-injected sessions are closed when the endpoint function returns the `StreamingResponse` object, which is before the generator runs. Instead the generator opens its own `async with async_session()` that stays alive for the entire stream.

```
request arrives
      │
      ▼
_get_or_create_session()  ← creates DB session row if new
      │
      ▼
_get_conversation_history()  ← loads prior messages
      │
      ▼
stream_chat_response()  ← yields SSE events, forwarded to client
      │
      ▼  (on message_end)
save user + assistant messages to DB
      │
      ▼  (first message in session)
generate_session_title_and_summary()  ← LLM call for sidebar label
      │
      ▼
db.commit()
```

---

## Frontend (`api.js` + `Chat.jsx`)

### `streamChatMessage` in `api.js`

Uses `fetch` with the `ReadableStream` API. Because TCP packets can split SSE messages mid-event, incoming bytes are accumulated in a string buffer and split on the `\n\n` delimiter before parsing.

```javascript
buffer += decoder.decode(value, { stream: true })
const parts = buffer.split('\n\n')
buffer = parts.pop() || ''  // keep incomplete trailing event

for (const part of parts) {
  // parse "event: <name>\ndata: <json>" and dispatch callback
}
```

**Callbacks:**

| Callback | Fired on event | Arguments |
|----------|---------------|-----------|
| `onMessageStart(sessionId)` | `message_start` | session UUID |
| `onToken(token)` | `token` | token string |
| `onToolStart(tools)` | `tool_start` | `[{name, args}]` |
| `onToolResult(tool, result)` | `tool_result` | tool name, result string |
| `onWidget(data)` | `widget` | full widget payload object |
| `onMessageEnd(fullMessage, sessionId, toolCalls)` | `message_end` | complete response |
| `onError(error)` | `error` | error string |

### `Chat.jsx` State During a Stream

```
User submits
      │
      ├─ setIsLoading(true)       ← spinner shown
      │
      ▼
onMessageStart
      │
      ├─ setSessionId(...)
      ├─ setIsLoading(false)
      └─ setIsStreaming(true)     ← streaming cursor shown

onToken (×N)
      └─ setStreamingContent(prev => prev + token)   ← live markdown render

onToolStart
      └─ setActiveTools([...])   ← tool badge shown in sidebar

onWidget
      └─ pendingWidgets.current.push(data)   ← collected for final message

onMessageEnd
      ├─ setMessages([...prev, { role:'assistant', content, widgets }])
      ├─ setStreamingContent('')
      └─ setIsStreaming(false)
```

Tokens are rendered live through `ReactMarkdown` with `remarkGfm`, so markdown formatting appears incrementally as the model writes it.

---

## Sessions & Conversation History

### Database Schema

Two PostgreSQL tables hold all persistent state:

```
chat_sessions
├── id          TEXT  PK  (UUID v4, generated server-side)
├── title       TEXT      auto-generated by LLM after first turn
├── summary     TEXT      auto-generated by LLM after first turn
├── created_at  TIMESTAMPTZ
└── updated_at  TIMESTAMPTZ  (updated on every write)

chat_messages
├── id          TEXT  PK  (UUID v4)
├── session_id  TEXT  FK → chat_sessions(id) ON DELETE CASCADE
├── role        TEXT      "user" | "assistant"
├── content     TEXT
├── tool_calls  TEXT      JSON-encoded list of {name, args} — nullable
└── created_at  TIMESTAMPTZ
                   (indexed on session_id for fast history lookups)
```

Messages are deleted automatically when the parent session is deleted (`ON DELETE CASCADE`). There is no explicit message-level delete endpoint.

### Session Lifecycle

```
1. Client sends POST /api/chat/stream (session_id: null)
         │
         ▼
2. Router calls _get_or_create_session()
   → no session_id supplied → INSERT chat_sessions row → new UUID returned
         │
         ▼
3. message_start SSE event carries the new session_id to the frontend
         │
         ▼
4. Frontend stores session_id in React state and passes it in all
   subsequent requests for this conversation
         │
         ▼
5. After message_end, router saves:
     INSERT chat_messages (role="user",      content=request.message)
     INSERT chat_messages (role="assistant", content=full_message, tool_calls=...)
         │
         ▼
6. If this is the FIRST turn (history was empty) and session has no title:
     → generate_session_title_and_summary() called (see below)
     → UPDATE chat_sessions SET title=..., summary=...
         │
         ▼
7. db.commit() — both messages and any title update are committed together
```

If `session_id` is provided and **exists** in the database the existing session is reused and history is loaded (step 8 below). If it does not exist a new session is created silently.

### How History Is Fed to the Agent

At the start of every request the router loads the full message history for the session ordered by `created_at`:

```python
stmt = (
    select(ChatMessage)
    .where(ChatMessage.session_id == session_id)
    .order_by(ChatMessage.created_at)
)
```

Each row is converted to a typed LangChain message before being placed into the initial `AgentState`:

```python
for msg in history:
    if msg["role"] == "user":
        messages.append(HumanMessage(content=msg["content"]))
    elif msg["role"] == "assistant":
        messages.append(AIMessage(content=msg["content"]))

messages.append(HumanMessage(content=user_message))  # current turn
```

This means the **agent itself is completely stateless** between requests. There is no in-memory session store or LangGraph checkpointer — the full context window is reconstructed from the database on every call.

```
Turn 1:  history=[]                                    → agent sees 1 message
Turn 2:  history=[T1 user, T1 assistant]               → agent sees 3 messages
Turn N:  history=[T1 user, T1 asst, …, T(N-1) asst]   → growing context window
```

Tool call details (`tool_calls` column) are stored on the `assistant` message row for audit purposes but are **not** replayed back into the context. The LLM only sees `HumanMessage` and `AIMessage` pairs; the tool execution trace is frontend-only metadata.

### Session Title & Summary Generation

After the first exchange in a new session the router makes a second LLM call to `generate_session_title_and_summary()`. This is a lightweight non-streaming call using a separate `ChatOpenAI` instance configured at temperature 0.3 with a max of 512 tokens.

The LLM is given a condensed transcript (capped at 20 messages, each truncated to 500 chars) and instructed to respond in strict format:

```
TITLE: <max 60 chars>
SUMMARY: <max 200 chars>
```

The parser strips markdown artefacts (e.g. `**TITLE:**`) and falls back to the first 60 characters of the user's message if the LLM call fails. The `POST /api/sessions/{id}/summarize` endpoint can be called at any time to regenerate the title and summary (the frontend calls it when a session is explicitly committed to history).

### Sessions API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sessions` | List all sessions, sorted by `updated_at` desc. Supports `?page=` and `?per_page=`. Returns `title`, `summary`, `message_count`. |
| `POST` | `/api/sessions` | Create a blank session (optional `title`). |
| `GET` | `/api/sessions/{id}` | Full session detail including all messages and `tool_calls` per message. |
| `DELETE` | `/api/sessions/{id}` | Delete session and all its messages (cascade). |
| `PATCH` | `/api/sessions/{id}` | Rename session title. |
| `POST` | `/api/sessions/{id}/summarize` | Re-generate title and summary from current messages. |

The legacy `GET /api/chat/history/{session_id}` and `DELETE /api/chat/history/{session_id}` endpoints still exist for backwards compatibility but are deprecated in favour of the sessions API.

---

## Nginx Buffering

The production Nginx config must not buffer the SSE response or tokens will be held until the buffer fills. The router sets `X-Accel-Buffering: no` on every streaming response, which Nginx honours automatically.

---

## Markdown Support

The frontend renders GitHub-flavored markdown via `react-markdown` + `remark-gfm`:

| Feature | Syntax |
|---------|--------|
| Headers | `# H1`, `## H2`, `### H3` |
| Bold / Italic | `**bold**`, `_italic_` |
| Lists | `- item`, `1. item` |
| Inline code | `` `code` `` |
| Code blocks | ` ```lang\n...\n``` ` |
| Tables | `\| a \| b \|` |
| Blockquotes | `> quote` |
| Links | `[text](url)` |
| Strikethrough | `~~text~~` |

---

## Adding a New Widget Type

See the [Widget System section in the README](README.md#adding-custom-widgets) for the step-by-step guide. The short version:

1. Return a JSON string with a `"context"` key from your tool
2. Add an `elif tool_name == "your_tool"` branch in `agent_streaming.py` to emit a `widget` event
3. Create a React component in `frontend/src/components/chat/widgets/`
4. Register it in `Widget.jsx` under a matching `type` string

---

## Customising the Agent for a Specific Use Case or Client

Every significant part of the agent's behaviour can be changed without touching the streaming or routing infrastructure. The changes below are localised to `agent.py`, `config.py`, and the frontend welcome copy.

### 1. Give the Agent a Persona and Scope (System Prompt)

The agent currently receives no system message, so the LLM uses its default general-purpose behaviour. Adding a `SystemMessage` at the front of the message list constrains the domain, tone, and identity.

In `agent_node` inside `backend/app/services/agent.py`:

```python
from langchain_core.messages import SystemMessage

SYSTEM_PROMPT = """\
You are Aria, a customer support assistant for Acme Corp.
Answer only questions about Acme products, billing, and technical support.
If a question is outside that scope, politely decline and redirect the user.
Always respond in the same language the user writes in.
Keep answers concise — prefer bullet points over long paragraphs.
"""

async def agent_node(state: AgentState, llm_with_tools) -> dict:
    messages = state["messages"]
    # Prepend system message on every call (stateless per-request design)
    full_messages = [SystemMessage(content=SYSTEM_PROMPT)] + list(messages)
    response = await llm_with_tools.ainvoke(full_messages)
    ...
```

Keep the system prompt in a module-level constant (or load it from a file / environment variable) so it is easy to swap per deployment without touching logic.

---

### 2. Swap or Restrict the Tool Set

The `tools` list in `create_agent()` is the single registry the agent can call. Remove tools the client does not need, or add domain-specific ones:

```python
# Minimal read-only support agent — no time tool, custom lookup tools added
tools = [query_knowledge_base, lookup_ticket, get_product_info]
llm_with_tools = llm.bind_tools(tools)
```

Because the agent decides which tools to invoke based solely on the bound schemas, removing a tool from the list is sufficient to prevent the agent from ever calling it.

---

### 3. Tune the LLM Parameters

All LLM parameters are driven by environment variables (see `config.py`). Override them per deployment in `.env` with no code changes:

| Variable | Effect | Example values |
|----------|--------|----------------|
| `LLM_MODEL` | Which model checkpoint to use | `gpt-4o`, `qwen3.5-27b` |
| `LLM_BASE_URL` | OpenAI-compatible endpoint | `https://api.openai.com/v1` |
| `LLM_API_KEY` | Credentials for the provider | `sk-…` |
| `LLM_TEMPERATURE` | Randomness (0 = deterministic) | `0.0` for factual support bots |
| `LLM_MAX_TOKENS` | Max tokens in a single response | `512` for concise replies |

For a **strict factual assistant** (e.g. legal or compliance) set `LLM_TEMPERATURE=0.0`. For a more creative agent (e.g. marketing copy) set it to `0.8–1.0`.

---

### 4. Connect a Client-Specific Knowledge Base

The `query_knowledge_base` tool reads its endpoint and collection names from settings:

```env
KNOWLEDGE_BASE_URL=https://rag.client-a.internal
KNOWLEDGE_BASE_API_KEY=secret
KB_COLLECTION_NAMES=products,policies,faq
KB_RERANKER_TOP_K=10
KB_VDB_TOP_K=50
KB_ENABLE_RERANKER=true
```

`KB_COLLECTION_NAMES` is a comma-separated list — point it at the Milvus collections that hold the client's documents. No code changes are required; the tool constructs the payload from settings at call time.

---

### 5. Scope the Agent to a Specific Knowledge Domain

To prevent the agent from answering off-topic questions even if the LLM tries to, add a guard directly in the `agent_node` — or strengthen the system prompt. A lightweight approach is to use the system prompt's instructions together with the knowledge base: if the knowledge base returns no results the tool already responds with "No results found", which signals to the LLM that the topic is outside the configured domain.

For a harder boundary, add a classification step before tool invocation:

```python
SYSTEM_PROMPT = """\
You are a support assistant. Only answer questions about our HR software product.
If you cannot find the answer in the knowledge base, say so and suggest contacting support.
Do NOT speculate or answer from general knowledge — only use the knowledge base tool.
"""
```

---

### 6. Multi-Client Deployments

If one backend must serve several clients simultaneously, the cleanest pattern is to pass a `client_id` through the request and resolve configuration dynamically:

**Option A — Separate deployments (recommended for isolation)**

Run one Docker Compose stack per client, each with its own `.env`. No code changes needed.

**Option B — Runtime config per request**

Add `client_id` to `ChatRequest` and look up client-specific settings:

```python
# schemas.py
class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    client_id: str | None = None  # e.g. "acme", "beta-corp"
```

```python
# agent.py — per-client factory
CLIENT_CONFIGS = {
    "acme": {
        "system_prompt": "You are Aria, Acme Corp support assistant...",
        "kb_collection": "acme_docs",
        "temperature": 0.0,
    },
    "beta-corp": {
        "system_prompt": "You are Beta Assistant...",
        "kb_collection": "betacorp_docs",
        "temperature": 0.5,
    },
}

def create_agent_for_client(client_id: str | None) -> StateGraph:
    cfg = CLIENT_CONFIGS.get(client_id or "default", CLIENT_CONFIGS["default"])
    llm = ChatOpenAI(temperature=cfg["temperature"], ...)
    tools = build_tools_for_client(cfg)
    ...
```

The session/streaming/router layers do not need to change — only `create_agent()` becomes `create_agent_for_client(client_id)`.

---

### 7. Update the Frontend Welcome Message and Branding

The chat opens with a static welcome message defined at the top of `frontend/src/pages/Chat.jsx`:

```javascript
const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hello! I'm Aria, Acme Corp's support assistant. I can help with:\n\n• Product questions\n• Billing and account queries\n• Technical support\n\nWhat can I help you with today?",
}
```

Also update the header title in the same file (`Chat.jsx`) and token colours / brand palette in `frontend/src/index.css` (CSS custom properties under `:root`).

---

### Customisation Checklist

| What to change | Where |
|----------------|-------|
| Agent persona, scope, language rules | `SYSTEM_PROMPT` in `agent.py` |
| Available tools | `tools` list in `create_agent()` |
| LLM model / temperature / tokens | `.env` |
| Knowledge base endpoint & collections | `.env` |
| Welcome message | `WELCOME_MESSAGE` in `Chat.jsx` |
| Brand colours | CSS variables in `index.css` |
| App name / title | `APP_NAME` in `.env`, header in `Chat.jsx` |
