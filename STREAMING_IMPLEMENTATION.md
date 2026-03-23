# Streaming Chat Implementation

This document describes the Server-Sent Events (SSE) streaming implementation added to the chatbot POC.

## Overview

The chatbot now supports real-time streaming of AI responses with:
- **Backend**: FastAPI StreamingResponse with SSE
- **Frontend**: ReadableStream API with live markdown rendering
- **Protocol**: Server-Sent Events format with typed events

## Architecture

```
┌─────────────┐     POST /api/chat/stream     ┌─────────────┐
│   Frontend  │ ─────────────────────────────> │   Backend   │
│  Chat.jsx   │                                │  chat.py    │
└─────────────┘                                └──────┬──────┘
       ^                                              │
       │           SSE Events (text/event-stream)     │
       │         event: token\n                        │
       │         data: {"token": "Hello"}\n\n         │
       │                                              │
       └──────────────────────────────────────────────┘
                             │
                             v
                    ┌─────────────────┐
                    │ agent_streaming │
                    │     .py         │
                    │  (LangGraph +   │
                    │   ChatOpenAI    │
                    │   streaming)    │
                    └─────────────────┘
```

## Backend Changes

### New Files

#### `backend/app/services/agent_streaming.py`

Creates a streaming LangGraph agent using `astream()` for real-time token generation.

**Key Features:**
- Async generator yielding SSE-formatted strings
- Two-phase execution: tool check (non-streaming) → response streaming
- Event types: `message_start`, `tool_start`, `tool_result`, `token`, `message_end`, `error`

```python
async def stream_chat_response(
    user_message: str,
    session_id: str,
    conversation_history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    # Yields: "event: token\ndata: {"token": "..."}\n\n"
```

**Event Format:**
```
event: message_start
data: {"session_id": "uuid"}

event: tool_start
data: {"tools": [{"name": "get_current_time", "args": {}}]}

event: token
data: {"token": "Hello"}

event: message_end
data: {"full_message": "Hello!", "session_id": "uuid", "tool_calls": [...]}

event: error
data: {"error": "..."}
```

#### Modified: `backend/app/routers/chat.py`

Added streaming endpoint:

```python
@router.post("/stream")
async def chat_stream(request: ChatRequest):
    async def event_generator():
        async for event in stream_chat_response(...):
            yield event
        # Save to history after streaming completes

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

### Dependencies Added

```txt
# backend/requirements.txt
markdown==3.7.*
```

## Frontend Changes

### New API Function: `frontend/src/api.js`

```javascript
export async function streamChatMessage(message, sessionId = null, callbacks = {}) {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {...})
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  // Parse SSE format
  while (true) {
    const { done, value } = await reader.read()
    // Parse "event: name\ndata: json\n\n"
  }
}
```

**Callbacks:**
- `onToken(token)` - Each token as it arrives
- `onToolStart(tools)` - When tools are invoked
- `onToolResult(tool, result)` - When tool completes
- `onMessageStart(sessionId)` - Stream begins
- `onMessageEnd(fullMessage, sessionId, toolCalls)` - Stream complete
- `onError(error)` - Error occurred

### Updated: `frontend/src/pages/Chat.jsx`

**New Dependencies:**
```json
{
  "react-markdown": "^9.0.1",
  "remark-gfm": "^4.0.0"
}
```

**Key Changes:**
1. Switched from `sendChatMessage` to `streamChatMessage`
2. Added `streamingContent` state for live token accumulation
3. Render assistant messages with `ReactMarkdown` + `remarkGfm`
4. Custom markdown components for consistent styling
5. Blinking cursor indicator during streaming

```jsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// In component:
const [streamingContent, setStreamingContent] = useState('')
const [isStreaming, setIsStreaming] = useState(false)

// During streaming:
onToken: (token) => setStreamingContent(prev => prev + token)

// Render:
<ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
  {streamingContent}
</ReactMarkdown>
```

## Markdown Support

The frontend now renders GitHub-flavored markdown including:

| Feature | Syntax | Description |
|---------|--------|-------------|
| Headers | `# H1`, `## H2` | Section headings |
| Bold/Italic | `**bold**`, `_italic_` | Text formatting |
| Lists | `- item`, `1. item` | Bullet/numbered lists |
| Code | `` `inline` `` or ` ```code``` ` | Inline and block code |
| Links | `[text](url)` | Hyperlinks |
| Tables | `|a|b|` | GFM tables |
| Blockquotes | `> quote` | Quoted text |
| Strikethrough | `~~text~~` | GFM strikethrough |

## API Endpoints

### POST /api/chat/stream

Streams chat responses in real-time.

**Request:**
```json
{
  "message": "What time is it?",
  "session_id": "optional-uuid"
}
```

**Response:**
```
Content-Type: text/event-stream

<stream of SSE events>
```

## Configuration

No additional configuration needed. The streaming respects existing environment variables:

```env
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1000
LLM_API_KEY=your-key
LLM_BASE_URL=https://api.openai.com/v1
```

## Performance Considerations

1. **Buffering**: Nginx buffering disabled via `X-Accel-Buffering: no` header
2. **Connection**: Keep-alive maintained for entire stream
3. **Memory**: Messages accumulated in memory until `message_end` event
4. **Concurrency**: Each stream is independent; no shared state between sessions

## Error Handling

### Backend
- Tool check failures logged but don't stop streaming
- LLM errors yield `event: error` and close stream
- History saved only on successful `message_end`

### Frontend
- Network errors trigger `onError` callback
- Partial messages discarded on error
- User shown error message in chat

## Testing

Start the development stack:
```bash
cd /workspace/group/projects/chatbot-poc
docker compose up
```

Access the chat at `http://localhost:8080`

Type a message and observe:
1. Loading dots appear (tool check phase)
2. Response streams in token-by-token
3. Markdown formatting renders live
4. Cursor blinks while streaming
5. Final message persists to history
