"""Finance API routes — stub for Task 6."""

from fastapi import APIRouter

router = APIRouter(tags=["finance"])


@router.get("/finance/summary")
async def get_finance_summary():
    """Get finance summary (stub)."""
    return {
        "mrr_cents": 0,
        "arr_cents": 0,
        "total_expenses_cents": 0,
        "total_revenue_cents": 0,
        "active_subscribers": 0,
    }
