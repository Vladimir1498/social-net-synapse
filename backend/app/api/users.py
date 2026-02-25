"""User and goal management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_session
from app.models import FocusSession, Interaction, Post, User
from app.schemas import (
    FocusSessionResponse,
    FocusSessionStart,
    SyncGoalRequest,
    SyncGoalResponse,
    UpdateLocationRequest,
    UpdateLocationResponse,
    UserPublic,
    UserResponse,
    UserStats,
)
from app.services.embedding import get_embedding_service
from app.services.matching import LocationService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current user profile.

    Args:
        current_user: Authenticated user.

    Returns:
        Current user profile.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    bio: str | None = None,
    username: str | None = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Update current user profile.

    Args:
        bio: New bio text.
        username: New username.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Updated user profile.
    """
    if bio is not None:
        current_user.bio = bio
    if username is not None:
        # Check if username is taken
        query = select(User).where(
            User.username == username,
            User.id != current_user.id,
        )
        result = await session.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        current_user.username = username

    session.add(current_user)
    await session.flush()
    await session.refresh(current_user)

    return current_user


@router.post("/sync-goal", response_model=SyncGoalResponse)
async def sync_goal(
    request: SyncGoalRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Sync user's current goal and update semantic vector.

    This endpoint takes a goal text, converts it to an embedding vector,
    and updates the user's bio_vector for semantic matching.

    Args:
        request: Goal sync request.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Sync confirmation.
    """
    # Get embedding service
    embedding_service = get_embedding_service()

    # Generate embedding for the goal
    goal_embedding = await embedding_service.embed_text(request.goal)

    # Update user
    current_user.current_goal = request.goal
    current_user.bio_vector = goal_embedding

    session.add(current_user)
    await session.flush()

    return {
        "message": "Goal synced successfully",
        "goal": request.goal,
        "vector_updated": True,
    }


@router.post("/update-location", response_model=UpdateLocationResponse)
async def update_location(
    request: UpdateLocationRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Update user's location and calculate H3 index.

    Args:
        request: Location update request.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Location update confirmation with H3 index.
    """
    location_service = LocationService(session)

    h3_index = await location_service.update_user_location(
        user_id=current_user.id,
        latitude=request.latitude,
        longitude=request.longitude,
    )

    return {
        "message": "Location updated successfully",
        "h3_index": h3_index,
        "latitude": request.latitude,
        "longitude": request.longitude,
    }


@router.get("/stats", response_model=UserStats)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get user statistics for dashboard.

    Args:
        current_user: Authenticated user.
        session: Database session.

    Returns:
        User statistics.
    """
    # Count connections
    connections_query = select(func.count()).select_from(Interaction).where(
        Interaction.from_user_id == current_user.id,
        Interaction.type == "connect",
    )
    connections_result = await session.execute(connections_query)
    connections_count = connections_result.scalar() or 0

    # Count posts
    posts_query = select(func.count()).select_from(Post).where(
        Post.author_id == current_user.id,
    )
    posts_result = await session.execute(posts_query)
    posts_count = posts_result.scalar() or 0

    # Count focus sessions
    focus_query = select(func.count()).select_from(FocusSession).where(
        FocusSession.user_id == current_user.id,
    )
    focus_result = await session.execute(focus_query)
    focus_sessions_count = focus_result.scalar() or 0

    # Calculate total focus minutes
    minutes_query = select(func.sum(FocusSession.duration_minutes)).select_from(
        FocusSession
    ).where(
        FocusSession.user_id == current_user.id,
        FocusSession.duration_minutes.isnot(None),
    )
    minutes_result = await session.execute(minutes_query)
    total_focus_minutes = minutes_result.scalar() or 0

    return {
        "impact_score": current_user.impact_score,
        "connections_count": connections_count,
        "posts_count": posts_count,
        "focus_sessions_count": focus_sessions_count,
        "total_focus_minutes": total_focus_minutes,
    }


@router.get("/{user_id}", response_model=UserPublic)
async def get_user_profile(
    user_id: str,
    session: AsyncSession = Depends(get_session),
) -> User:
    """Get public profile of another user.

    Args:
        user_id: User ID to fetch.
        session: Database session.

    Returns:
        User public profile.

    Raises:
        HTTPException: If user not found.
    """
    query = select(User).where(User.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


# ============ Focus Mode Endpoints ============

@router.post("/focus/start", response_model=FocusSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_focus_session(
    request: FocusSessionStart,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FocusSession:
    """Start a new focus session.

    Args:
        request: Focus session start request.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Created focus session.

    Raises:
        HTTPException: If user already has an active session.
    """
    # Check for existing active session
    query = select(FocusSession).where(
        FocusSession.user_id == current_user.id,
        FocusSession.is_active == True,
    )
    result = await session.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active focus session",
        )

    # Create new session
    focus_session = FocusSession(
        user_id=current_user.id,
        goal=request.goal,
    )
    session.add(focus_session)
    await session.flush()
    await session.refresh(focus_session)

    return focus_session


@router.post("/focus/end", response_model=FocusSessionResponse)
async def end_focus_session(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FocusSession:
    """End the current focus session.

    Args:
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Ended focus session.

    Raises:
        HTTPException: If no active session found.
    """
    from datetime import datetime

    # Find active session
    query = select(FocusSession).where(
        FocusSession.user_id == current_user.id,
        FocusSession.is_active == True,
    )
    result = await session.execute(query)
    focus_session = result.scalar_one_or_none()

    if not focus_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active focus session found",
        )

    # End session
    focus_session.is_active = False
    focus_session.end_time = datetime.utcnow()
    focus_session.duration_minutes = int(
        (focus_session.end_time - focus_session.start_time).total_seconds() / 60
    )

    session.add(focus_session)
    await session.flush()
    await session.refresh(focus_session)

    return focus_session


@router.get("/focus/current", response_model=FocusSessionResponse | None)
async def get_current_focus_session(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FocusSession | None:
    """Get current active focus session.

    Args:
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Active focus session or None.
    """
    query = select(FocusSession).where(
        FocusSession.user_id == current_user.id,
        FocusSession.is_active == True,
    )
    result = await session.execute(query)
    return result.scalar_one_or_none()
