"""Matching and proximity API routes (The Beacon)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_session
from app.models import User
from app.schemas import (
    ConnectRequest,
    ConnectResponse,
    ImpactRequest,
    ImpactResponse,
    MatchResult,
    MatchesResponse,
    UserPublic,
)
from app.services.matching import MatchingService

router = APIRouter(prefix="/matching", tags=["Matching"])


@router.get("/matches", response_model=MatchesResponse)
async def get_matches(
    rings: int = 2,
    limit: int = 20,
    min_similarity: float = 0.0,
    matching_goals_only: bool = False,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get proximity-based matches with semantic similarity.

    This endpoint performs a hybrid query:
    1. Filters users in the same or neighboring H3 cells.
    2. Performs Cosine Similarity between the requester's bio_vector and others.
    3. Returns a ranked list with "Similarity %".

    Args:
        rings: Number of H3 rings to search (default 2).
        limit: Maximum number of results.
        min_similarity: Minimum similarity percentage threshold.
        matching_goals_only: Only return users with high semantic similarity (>50%).
        current_user: Authenticated user.
        session: Database session.

    Returns:
        List of matches with similarity scores.
    """
    # Check if user has location set
    if not current_user.h3_index:
        return {
            "matches": [],
            "total_count": 0,
            "user_h3_index": "",
        }

    # Check if user has bio_vector set (handle numpy array)
    if current_user.bio_vector is None or (
        hasattr(current_user.bio_vector, "__len__") and len(current_user.bio_vector) == 0
    ):
        return {
            "matches": [],
            "total_count": 0,
            "user_h3_index": current_user.h3_index,
        }

    # Find matches
    matching_service = MatchingService(session)
    matches = await matching_service.find_matches(
        user_id=current_user.id,
        user_vector=current_user.bio_vector,
        h3_index=current_user.h3_index,
        rings=rings,
        min_similarity=min_similarity,
        limit=limit,
    )

    # Filter by matching_goals_only if enabled
    if matching_goals_only:
        matches = [m for m in matches if m["similarity_percentage"] > 50]

    # Format response
    match_results = []
    for match in matches:
        user = match["user"]
        match_results.append(
            MatchResult(
                user=UserPublic(
                    id=user.id,
                    username=user.username,
                    bio=user.bio,
                    current_goal=user.current_goal,
                    impact_score=user.impact_score,
                    is_focusing=user.is_focusing,
                    current_focus_goal=user.current_focus_goal,
                ),
                similarity_percentage=match["similarity_percentage"],
                h3_distance=match["h3_distance"],
                is_neighbor=match["is_neighbor"],
            )
        )

    return {
        "matches": match_results,
        "total_count": len(match_results),
        "user_h3_index": current_user.h3_index,
    }


@router.get("/nearby", response_model=list[UserPublic])
async def get_nearby_users(
    rings: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Get users in nearby H3 cells (without similarity filtering).

    Args:
        rings: Number of H3 rings to search.
        limit: Maximum number of results.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        List of nearby users.

    Raises:
        HTTPException: If user has no location set.
    """
    if not current_user.h3_index:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please update your location first",
        )

    matching_service = MatchingService(session)
    nearby_users = await matching_service.find_nearby_users(
        user_id=current_user.id,
        h3_index=current_user.h3_index,
        rings=rings,
        limit=limit,
    )

    return [
        UserPublic(
            id=user.id,
            username=user.username,
            bio=user.bio,
            current_goal=user.current_goal,
            impact_score=user.impact_score,
            is_focusing=user.is_focusing,
            current_focus_goal=user.current_focus_goal,
        )
        for user in nearby_users
    ]


@router.get("/global", response_model=list[dict])
async def get_global_matches(
    limit: int = 20,
    min_similarity: float = 30.0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Get global semantic matches (not proximity-based).

    Args:
        limit: Maximum number of results.
        min_similarity: Minimum similarity percentage threshold.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        List of global matches.

    Raises:
        HTTPException: If user has no bio_vector set.
    """
    if not current_user.bio_vector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please sync your goal first to enable matching",
        )

    matching_service = MatchingService(session)
    matches = await matching_service.find_semantic_matches(
        user_id=current_user.id,
        user_vector=current_user.bio_vector,
        limit=limit,
        min_similarity=min_similarity,
    )

    return matches


@router.post("/impact", response_model=ImpactResponse, status_code=status.HTTP_201_CREATED)
async def give_impact(
    request: ImpactRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Give impact/feedback to another user.

    The Impact Engine:
    1. User A gives feedback
    2. LLM analyzes if it's constructive
    3. If yes, impact_score of User B increases

    Args:
        request: Impact request with feedback.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Impact response with constructiveness analysis.

    Raises:
        HTTPException: If target user not found or self-impact.
    """
    from app.models import Interaction
    from app.services.impact import get_impact_service

    # Prevent self-impact
    if request.to_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot give impact to yourself",
        )

    # Find target user
    query = select(User).where(User.id == request.to_user_id)
    result = await session.execute(query)
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found",
        )

    # Check for duplicate/rapid impacts (rate limiting) - check last 24 hours
    from datetime import datetime, timedelta
    recent_query = select(Interaction).where(
        Interaction.from_user_id == current_user.id
    ).where(
        Interaction.to_user_id == request.to_user_id
    ).where(
        Interaction.created_at >= datetime.utcnow() - timedelta(hours=24)
    )
    recent_result = await session.execute(recent_query)
    if recent_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You've already given impact to this user recently. Please wait 24 hours.",
        )

    # Analyze feedback
    impact_service = get_impact_service()
    is_constructive, reason = await impact_service.analyze_feedback(request.feedback_content)

    # Calculate impact points
    impact_points = impact_service.calculate_impact_points(
        is_constructive=is_constructive,
        feedback_length=len(request.feedback_content),
    )

    # Update target user's impact score
    if impact_points > 0:
        target_user.impact_score += impact_points
        session.add(target_user)

    # Create interaction record
    interaction = Interaction(
        from_user_id=current_user.id,
        to_user_id=target_user.id,
        type="impact",
        feedback_content=request.feedback_content,
        is_constructive=is_constructive,
    )
    session.add(interaction)
    await session.flush()

    return {
        "message": "Feedback analyzed and impact applied" if is_constructive else "Feedback analyzed but not constructive",
        "is_constructive": is_constructive,
        "impact_given": impact_points,
    }


@router.post("/connect", response_model=ConnectResponse, status_code=status.HTTP_201_CREATED)
async def request_connection(
    request: ConnectRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Request a connection with another user.

    Two-step flow:
    1. User A clicks Connect on User B -> creates pending request
    2. User B clicks Connect on User A -> accepts, mutual connection established

    Args:
        request: Connection request.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Connection confirmation with status.

    Raises:
        HTTPException: If target user not found or self-connection.
    """
    from app.models import Interaction

    # Prevent self-connection
    if request.to_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot connect with yourself",
        )

    # Find target user
    query = select(User).where(User.id == request.to_user_id)
    result = await session.execute(query)
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found",
        )

    # Check if I already sent a request to this user
    outgoing_query = select(Interaction).where(
        Interaction.from_user_id == current_user.id,
        Interaction.to_user_id == request.to_user_id,
        Interaction.type == "connect",
    )
    outgoing_result = await session.execute(outgoing_query)
    existing_outgoing = outgoing_result.scalar_one_or_none()

    # Check if target already sent me a request (reverse direction)
    incoming_query = select(Interaction).where(
        Interaction.from_user_id == request.to_user_id,
        Interaction.to_user_id == current_user.id,
        Interaction.type == "connect",
    )
    incoming_result = await session.execute(incoming_query)
    existing_incoming = incoming_result.scalar_one_or_none()

    if existing_outgoing and existing_incoming:
        # Already fully connected in both directions
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already connected with this user",
        )

    if existing_incoming and not existing_outgoing:
        # Target already sent me a request — accept it
        existing_incoming.is_read = True
        session.add(existing_incoming)

        # Create my outgoing connection (completing the mutual link)
        interaction = Interaction(
            from_user_id=current_user.id,
            to_user_id=target_user.id,
            type="connect",
            is_read=True,
        )
        session.add(interaction)
        await session.flush()

        return {
            "message": "Connection accepted",
            "connection_id": interaction.id,
            "status": "accepted",
        }

    if existing_outgoing:
        # I already sent a request
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection request already sent",
        )

    # New pending request
    interaction = Interaction(
        from_user_id=current_user.id,
        to_user_id=target_user.id,
        type="connect",
        is_read=False,
    )
    session.add(interaction)
    await session.flush()

    return {
        "message": "Connection request sent",
        "connection_id": interaction.id,
        "status": "pending",
    }


@router.get("/connection-status/{user_id}")
async def get_connection_status(
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Check if current user is connected with another user (mutual).

    Connected = both A->B and B->A exist with is_read=True.
    """
    from app.models import Interaction

    # Check outgoing (me -> them, accepted)
    outgoing = select(Interaction).where(
        Interaction.from_user_id == current_user.id,
        Interaction.to_user_id == user_id,
        Interaction.type == "connect",
        Interaction.is_read == True,
    )
    out_result = await session.execute(outgoing)
    has_outgoing = out_result.scalar_one_or_none() is not None

    # Check incoming (them -> me, accepted)
    incoming = select(Interaction).where(
        Interaction.from_user_id == user_id,
        Interaction.to_user_id == current_user.id,
        Interaction.type == "connect",
        Interaction.is_read == True,
    )
    in_result = await session.execute(incoming)
    has_incoming = in_result.scalar_one_or_none() is not None

    # Check if there's a pending request from them to me
    pending_incoming = select(Interaction).where(
        Interaction.from_user_id == user_id,
        Interaction.to_user_id == current_user.id,
        Interaction.type == "connect",
        Interaction.is_read == False,
    )
    pending_result = await session.execute(pending_incoming)
    has_pending_incoming = pending_result.scalar_one_or_none() is not None

    return {
        "is_connected": has_outgoing and has_incoming,
        "is_pending": has_pending_incoming,
    }


@router.get("/connections", response_model=list[dict])
async def get_connections(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Get all confirmed (mutual) connections.

    A connection is mutual when both A->B and B->A exist with is_read=True.
    Returns the OTHER user's info for each connection.
    """
    from app.models import Interaction

    # Find accepted outgoing interactions where the reverse also exists
    query = (
        select(Interaction)
        .where(
            Interaction.from_user_id == current_user.id,
            Interaction.type == "connect",
            Interaction.is_read == True,
        )
        .order_by(Interaction.created_at.desc())
    )
    result = await session.execute(query)
    outgoing_accepted = result.scalars().all()

    connections = []
    for interaction in outgoing_accepted:
        # Verify the reverse exists (mutual)
        reverse_query = select(Interaction).where(
            Interaction.from_user_id == interaction.to_user_id,
            Interaction.to_user_id == current_user.id,
            Interaction.type == "connect",
            Interaction.is_read == True,
        )
        reverse_result = await session.execute(reverse_query)
        reverse = reverse_result.scalar_one_or_none()

        if not reverse:
            continue

        # Get the other user's info
        user_query = select(User).where(User.id == interaction.to_user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()

        if user:
            connections.append({
                "user_id": user.id,
                "username": user.username,
                "bio": user.bio,
                "current_goal": user.current_goal,
                "impact_score": user.impact_score,
                "is_focusing": user.is_focusing,
                "current_focus_goal": user.current_focus_goal,
                "connected_at": interaction.created_at.isoformat(),
            })

    return connections


@router.get("/pending", response_model=list[dict])
async def get_pending_connections(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Get incoming pending connection requests (need acceptance).

    These are connections where someone sent me a request
    but I haven't accepted yet (no reverse link exists).
    """
    from app.models import Interaction

    # Find incoming requests (them -> me) that are not yet accepted
    query = (
        select(Interaction)
        .where(
            Interaction.to_user_id == current_user.id,
            Interaction.type == "connect",
            Interaction.is_read == False,
        )
        .order_by(Interaction.created_at.desc())
    )
    result = await session.execute(query)
    incoming_requests = result.scalars().all()

    pending = []
    for interaction in incoming_requests:
        # Check if I already accepted (outgoing link exists)
        reverse_query = select(Interaction).where(
            Interaction.from_user_id == current_user.id,
            Interaction.to_user_id == interaction.from_user_id,
            Interaction.type == "connect",
        )
        reverse_result = await session.execute(reverse_query)
        if reverse_result.scalar_one_or_none():
            continue  # Already accepted

        # Get the sender's info
        user_query = select(User).where(User.id == interaction.from_user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()

        if user:
            pending.append({
                "user_id": user.id,
                "username": user.username,
                "bio": user.bio,
                "current_goal": user.current_goal,
                "sent_at": interaction.created_at.isoformat(),
            })

    return pending
