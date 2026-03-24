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
| *Modern UI* | React frontend with markdown support and tool visualization |

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
