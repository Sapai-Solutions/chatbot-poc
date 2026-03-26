# Chatbot Template

A production-ready AI chatbot starter template with **LangGraph** integration. Features a ReAct agent with tool calling, real-time streaming responses, session management, and a modern React frontend.

Built on **aras-fullstack-template** by Aras Integrasi.

`docker compose up` → start chatting.

---

## Overview

This template provides everything you need to build and deploy an AI-powered chatbot:

| Feature | Description |
|---------|-------------|
| *LangGraph Agent* | ReAct pattern with tool calling and state management |
| *Streaming Responses* | Real-time token streaming via Server-Sent Events |
| *Session Management* | Persistent conversation history per session |
| *Tool System* | Easy-to-extend tool calling framework |
| *Knowledge Base* | RAG integration ready — connect your own knowledge base |
| *Widget System* | Tools can spawn interactive inline widgets inside the chat |
| *Modern UI* | React frontend with markdown support and tool visualization |

For a detailed explanation of how messages flow from the browser through the LangGraph agent graph and back as a live stream, see **[Agent Architecture & Implementation](AGENT_ARCHITECTURE.md)**.

---

## Quick Start

### 1. Configure Environment

```bash
cd chatbot-poc

# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env
```

Required environment variables:
```
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://your-llm-provider.com/v1
LLM_MODEL=qwen3.5-27b
```

### 2. Start the Application

```bash
docker compose up
```

The application will be available at:

| URL | Description |
|-----|-------------|
| `http://localhost:8080` | Chat UI |
| `http://localhost:8000/docs` | FastAPI Swagger UI |
| `http://localhost:8000/api/chat` | Chat API endpoint |

---

## API Endpoints

### Send a Message
```bash
POST /api/chat
{
  "message": "Hello, what can you do?",
  "session_id": "optional-existing-session-id"
}
```

### Stream a Response
```bash
POST /api/chat/stream
{
  "message": "What's the current time?"
}
```
Returns: Server-Sent Events stream with tokens, tool calls, and metadata.

### Get Conversation History
```bash
GET /api/chat/history/{session_id}
```

### Clear History
```bash
DELETE /api/chat/history/{session_id}
```

---

## How the Agent Works

The chatbot is powered by a **LangGraph ReAct agent** — a directed graph that loops between an LLM node and a tools node until the model produces a final answer.

```
START → agent node → (tool calls?) → tools node → agent node → … → END
```

1. **agent node** — the LLM receives the conversation history and decides whether to call a tool or respond directly.
2. **tools node** — requested tools are executed and their results appended to the message state.
3. The cycle repeats until the LLM produces a response without any tool calls.

Every LLM token is forwarded to the browser as it is generated via **Server-Sent Events**. The frontend accumulates tokens and renders live GitHub-flavored markdown so the response appears word-by-word.

**Full details** — graph structure, SSE event reference, widget detection, multi-turn context, Nginx configuration: [AGENT_ARCHITECTURE.md](AGENT_ARCHITECTURE.md)

---

## Adding Custom Tools

Tools are Python functions decorated with `@tool`. The agent can automatically discover and call them.

### 1. Define a Tool

Add to `backend/app/services/agent.py`:

```python
from langchain_core.tools import tool

@tool
def search_products(query: str, category: str = "all") -> str:
    """Search for products in the catalog.

    Args:
        query: Product name or description to search for
        category: Product category filter (optional)
    """
    # Your implementation here
    results = product_db.search(query, category)
    return json.dumps(results)
```

### 2. Register the Tool

Add your tool to the tools list in `create_agent()`:

```python
tools = [get_current_time, query_knowledge_base, search_products]
```

### 3. Add Tool Icon (Frontend)

In `frontend/src/pages/Chat.jsx`, add an icon mapping:

```jsx
{tool.tool_name === 'search_products' ? (
  <ShoppingBag className="w-4 h-4 text-primary" />
) : ...}
```

That's it! The agent will now automatically call your tool when relevant.

---

## Adding Custom Widgets

Widgets are interactive React components that are rendered **inline inside a chat message** when a specific tool call completes. They appear below the assistant's markdown response and can have collapsible sections or interactive state.

The system has three layers:

```
Tool (backend) → widget SSE event → api.js → Chat.jsx → Widget registry → Your component
```

### How it works

1. A tool returns a JSON string with a `"context"` key. `agent_streaming.py` detects this envelope and emits a `widget` SSE event containing a `type` string and any structured data, **in addition to** the normal `tool_result` event (which forwards the `context` text to the LLM unchanged).
2. The frontend `streamChatMessage` function in `api.js` fires `onWidget(data)` for each widget event received.
3. `Chat.jsx` collects widget payloads during streaming and attaches them to the final assistant message.
4. The message renderer passes each widget to `<Widget data={...} />`, which looks up the right component in the registry.

---

### Step 1 — Return structured data from the tool

In `backend/app/services/agent.py`, return a JSON string with a `context` field (the LLM-readable text) plus any extra fields for the widget:

```python
import json
from langchain_core.tools import tool

@tool
def lookup_product(sku: str) -> str:
    """Look up a product by SKU and return pricing and stock info."""
    product = db.get_product(sku)
    if not product:
        return f"No product found for SKU: {sku}"

    # Plain text for the LLM
    context = f"Product: {product.name}\nPrice: ${product.price}\nStock: {product.stock} units"

    # Return structured envelope — context goes to the LLM, the rest
    # is forwarded to the frontend as a widget event.
    return json.dumps({
        "context": context,
        "sku": sku,
        "name": product.name,
        "price": product.price,
        "stock": product.stock,
        "image_url": product.image_url,
    })
```

Register the tool in `create_agent()` as with any other tool:

```python
tools = [get_current_time, query_knowledge_base, lookup_product]
```

---

### Step 2 — Emit the widget SSE event

In `backend/app/services/agent_streaming.py`, inside the `on_tool_end` handler, add a branch for your tool after the existing `query_knowledge_base` branch:

```python
# existing branch
if tool_name == "query_knowledge_base" and "sources" in result_data:
    yield (
        f"event: widget\n"
        f"data: {json.dumps({'type': 'knowledge_base_results', ...})}\n\n"
    )

# your new branch
elif tool_name == "lookup_product" and "sku" in result_data:
    yield (
        f"event: widget\n"
        f"data: {json.dumps({'type': 'product_card', 'sku': result_data['sku'], 'name': result_data['name'], 'price': result_data['price'], 'stock': result_data['stock'], 'image_url': result_data.get('image_url', '')})}\n\n"
    )
```

The `type` string is the shared key that links the SSE event to the React component.

---

### Step 3 — Build the React component

Create `frontend/src/components/chat/widgets/ProductCardWidget.jsx`:

```jsx
import { motion } from 'motion/react'
import { ShoppingBag } from 'lucide-react'

export default function ProductCardWidget({ data }) {
  const { name, price, stock, image_url, sku } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
      className="mt-3 pt-3 border-t border-border"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
          <ShoppingBag className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs font-semibold text-foreground">Product</span>
      </div>

      <div className="rounded-xl border border-border bg-background p-3 flex gap-3">
        {image_url && (
          <img src={image_url} alt={name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">SKU: {sku}</p>
          <div className="flex gap-3 mt-2">
            <span className="text-xs font-semibold text-primary">${price}</span>
            <span className="text-xs text-muted-foreground">{stock} in stock</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
```

Follow the design system rules (CSS variables, `motion` for animation, no hardcoded colours).

---

### Step 4 — Register the component

Add one line to `frontend/src/components/chat/widgets/Widget.jsx`:

```jsx
import KnowledgeBaseWidget from './KnowledgeBaseWidget'
import ProductCardWidget from './ProductCardWidget'   // ← add

const WIDGET_REGISTRY = {
  knowledge_base_results: KnowledgeBaseWidget,
  product_card: ProductCardWidget,                   // ← add
}
```

That's it. The next time `lookup_product` is called the widget will appear inline automatically.

---

## Connecting a Knowledge Base

Configure RAG (Retrieval-Augmented Generation) by setting these environment variables:

```bash
KNOWLEDGE_BASE_URL=https://your-rag-service.com
KNOWLEDGE_BASE_API_KEY=your_api_key_here
```

The built-in `query_knowledge_base` tool will:
- Query your RAG endpoint at `POST {KNOWLEDGE_BASE_URL}/query`
- Pass the `Authorization` header with your API key
- Extract answers from common response formats (`answer`, `response`, or `result` fields)

---

## Frontend Customization

### Welcome Message
Edit the welcome message in `frontend/src/pages/Chat.jsx`:

```javascript
const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hello! I'm your custom assistant. I can help with:\n\n• Your custom feature\n• Another feature\n\nWhat would you like to know?",
}
```

### Branding
- Update the header title and description in `Chat.jsx`
- Replace `public/logo.png` with your logo
- Customize colors in `frontend/src/index.css` (CSS variables)

### Adding Pages
1. Create `frontend/src/pages/YourPage.jsx`
2. Add route in `frontend/src/App.jsx`:
   ```jsx
   import YourPage from './pages/YourPage'
   <Route path="/your-page" element={<YourPage />} />
   ```

---

## Project Structure

```
chatbot-poc/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── agent.py              # LangGraph ReAct agent
│   │   │   └── agent_streaming.py    # SSE streaming implementation
│   │   ├── routers/
│   │   │   └── chat.py               # Chat API endpoints
│   │   ├── models.py                 # Database models
│   │   └── schemas.py                # Pydantic schemas
│   ├── requirements.txt
│   ├── Dockerfile
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Chat.jsx              # Main chat interface
│   │   │   └── Home.jsx              # Landing page
│   │   ├── components/
│   │   │   └── chat/
│   │   │       └── widgets/
│   │   │           ├── Widget.jsx             # Registry — maps type → component
│   │   │           └── KnowledgeBaseWidget.jsx # Built-in KB results widget
│   │   ├── api.js                    # API client (includes streaming)
│   │   └── ...
│   ├── package.json
│   ├── Dockerfile
│   └── ...
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_API_KEY` | Yes | API key for your LLM provider |
| `LLM_BASE_URL` | Yes | Base URL for LLM API (OpenAI-compatible) |
| `LLM_MODEL` | No | Model name (default: qwen3.5-27b) |
| `LLM_TEMPERATURE` | No | Sampling temperature (default: 0.7) |
| `LLM_MAX_TOKENS` | No | Max response tokens (default: 2048) |
| `KNOWLEDGE_BASE_URL` | No | URL for RAG service |
| `KNOWLEDGE_BASE_API_KEY` | No | API key for knowledge base |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `SECRET_KEY` | Yes (prod) | App secret for sessions |

---

## Daily Development

```bash
# Start development stack
docker compose up

# Start in background
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Run database migrations
docker compose exec backend alembic upgrade head

# Open Python shell
docker compose exec backend python

# Open database shell
docker compose exec db psql -U chatbotpoc -d chatbotpoc_db
```

---

## Production Deployment

```bash
# Build and start production stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

For detailed deployment options, see the [fullstack template documentation](https://github.com/MTAI-Labs/aras-fullstack-template).

---

## Documentation

- **GitHub**: https://github.com/Sapai-Solutions/chatbot-poc
- **Fullstack Template**: https://github.com/MTAI-Labs/aras-fullstack-template

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| AI Framework | LangGraph + LangChain |
| LLM Interface | OpenAI-compatible API |
| Backend | FastAPI (Python 3.12) |
| Frontend | React 19 + Vite 6 + Tailwind CSS |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Workers | Celery 5 (optional) |
| Proxy | Nginx |
| Containers | Docker + Docker Compose |

---

*Built with aras-fullstack-template · Aras Integrasi*
