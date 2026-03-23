"""LangGraph agent service for chatbot with tool calling capabilities.

This service implements a ReAct agent pattern using LangGraph that can:
- Answer questions about Aras/MTAI using a knowledge base
- Make tool calls (e.g., getting current time)
- Maintain conversation context
"""

import json
import logging
from datetime import datetime
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


# ── State Definition ───────────────────────────────────────────────────────────


class AgentState(TypedDict):
    """State maintained throughout the agent's execution."""
    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str
    tool_calls: list[dict]


# ── Tools ──────────────────────────────────────────────────────────────────────


@tool
def get_current_time() -> str:
    """Get the current date and time in a human-readable format."""
    now = datetime.now()
    return f"The current date and time is: {now.strftime('%A, %B %d, %Y at %I:%M %p')}"


@tool
def query_knowledge_base(query: str) -> str:
    """Query the knowledge base for information.

    Configure KNOWLEDGE_BASE_URL in .env to connect to your RAG service.

    Args:
        query: The search query
    """
    import httpx

    kb_url = settings.KNOWLEDGE_BASE_URL

    # If no KB URL configured, return placeholder
    if not kb_url:
        return (
            f"Knowledge base not configured. "
            f"Set KNOWLEDGE_BASE_URL in .env to enable RAG queries. "
            f"Query was: '{query}'"
        )

    try:
        headers = {}
        if settings.KNOWLEDGE_BASE_API_KEY:
            headers["Authorization"] = f"Bearer {settings.KNOWLEDGE_BASE_API_KEY}"

        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{kb_url}/query",
                json={"query": query},
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

            # Extract answer from common RAG response formats
            if "answer" in data:
                return data["answer"]
            elif "response" in data:
                return data["response"]
            elif "result" in data:
                return data["result"]
            else:
                return str(data)

    except httpx.HTTPStatusError as e:
        logger.error(f"Knowledge base query failed: {e}")
        return f"Error querying knowledge base: {e.response.status_code}"
    except httpx.RequestError as e:
        logger.error(f"Knowledge base connection failed: {e}")
        return f"Could not connect to knowledge base at {kb_url}"
    except Exception as e:
        logger.error(f"Unexpected error in knowledge base query: {e}")
        return f"Error processing knowledge base query: {str(e)}""


# ── Agent Setup ─────────────────────────────────────────────────────────────────


def create_agent() -> StateGraph:
    """Create and configure the LangGraph agent."""

    # Initialize the LLM with Qwen3.5-27B deployed model
    llm = ChatOpenAI(
        model=settings.LLM_MODEL,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS,
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
    )

    # Bind tools to the LLM
    tools = [get_current_time, query_knowledge_base]
    llm_with_tools = llm.bind_tools(tools)

    # Define the workflow
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("agent", lambda state: agent_node(state, llm_with_tools))
    workflow.add_node("tools", lambda state: tool_node(state, tools))

    # Add edges
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "continue": "tools",
            "end": END,
        },
    )
    workflow.add_edge("tools", "agent")

    return workflow.compile()


def agent_node(state: AgentState, llm_with_tools) -> dict:
    """The agent node that processes messages and decides on tool calls."""
    messages = state["messages"]
    response = llm_with_tools.invoke(messages)

    # Track tool calls
    tool_calls = []
    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_calls = response.tool_calls

    return {
        "messages": [response],
        "tool_calls": tool_calls,
    }


def tool_node(state: AgentState, tools: list) -> dict:
    """Execute tool calls and return results."""
    messages = state["messages"]
    last_message = messages[-1]

    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return {"messages": []}

    tool_results = []
    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_id = tool_call["id"]

        # Find and execute the tool
        for tool_func in tools:
            if tool_func.name == tool_name:
                try:
                    result = tool_func.invoke(tool_args)
                    tool_results.append(
                        ToolMessage(content=str(result), tool_call_id=tool_id)
                    )
                    logger.info(f"Tool {tool_name} executed successfully")
                except Exception as e:
                    logger.error(f"Tool {tool_name} failed: {e}")
                    tool_results.append(
                        ToolMessage(
                            content=f"Error executing {tool_name}: {str(e)}",
                            tool_call_id=tool_id,
                        )
                    )
                break

    return {"messages": tool_results}


def should_continue(state: AgentState) -> str:
    """Determine if the agent should continue or end."""
    messages = state["messages"]
    last_message = messages[-1]

    # If the last message has tool calls, continue to execute them
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "continue"

    # Otherwise, end the conversation
    return "end"


# ── Public API ─────────────────────────────────────────────────────────────────

_agent_instance = None


def get_agent():
    """Get or create the singleton agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = create_agent()
    return _agent_instance


async def process_chat_message(
    user_message: str,
    session_id: str,
    conversation_history: list[dict] | None = None,
) -> dict:
    """Process a chat message through the LangGraph agent.

    Args:
        user_message: The user's input message
        session_id: Unique identifier for the conversation session
        conversation_history: Optional previous messages for context

    Returns:
        dict containing the assistant's response and metadata
    """
    agent = get_agent()

    # Build initial state
    messages = []
    if conversation_history:
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))

    initial_state = AgentState(
        messages=messages,
        session_id=session_id,
        tool_calls=[],
    )

    # Execute the agent
    try:
        result = agent.invoke(initial_state)
        final_message = result["messages"][-1]

        # Extract tool call information
        tool_calls_info = []
        for msg in result["messages"]:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_calls_info.append({
                        "tool_name": tc.get("name", "unknown"),
                        "arguments": tc.get("args", {}),
                    })
            elif isinstance(msg, ToolMessage):
                # Match tool result to call
                if tool_calls_info:
                    tool_calls_info[-1]["result"] = msg.content

        return {
            "message": final_message.content,
            "session_id": session_id,
            "tool_calls": tool_calls_info if tool_calls_info else None,
        }

    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        return {
            "message": f"I apologize, but I encountered an error processing your request. Please try again.",
            "session_id": session_id,
            "tool_calls": None,
        }
