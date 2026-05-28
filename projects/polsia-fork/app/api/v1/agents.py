"""Agent API routes — stub for Task 6."""

from fastapi import APIRouter

router = APIRouter(tags=["agents"])


@router.get("/agents")
async def list_agents():
    """List all agents with status (stub)."""
    return []


@router.post("/agents/{agent_type}/trigger")
async def trigger_agent(agent_type: str):
    """Trigger an agent run (stub)."""
    return {"message": f"{agent_type} agent triggered (mock)"}
