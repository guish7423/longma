"""Task API routes — stub for Task 6."""

from fastapi import APIRouter

router = APIRouter(tags=["tasks"])


@router.get("/tasks")
async def list_tasks(limit: int = 100, status: str | None = None):
    """List tasks with optional filters (stub)."""
    return []
