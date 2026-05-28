"""Dashboard API routes — stub for Task 6."""

from fastapi import APIRouter

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary")
async def get_dashboard_summary():
    """Get dashboard summary (stub)."""
    return {
        "tasks_today_total": 0,
        "tasks_today_pending": 0,
        "tasks_today_completed": 0,
        "tasks_today_failed": 0,
        "active_agents": 10,
        "recent_activity_count": 0,
        "total_expenses_cents": 0,
        "mrr_cents": 0,
        "arr_cents": 0,
        "active_subscribers": 0,
    }
