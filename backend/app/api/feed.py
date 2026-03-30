"""Feed API routes for AI-curated content."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_session
from app.models import Post, User
from app.schemas import FeedResponse, PostCreate, PostResponse

router = APIRouter(prefix="/feed", tags=["Feed"])


@router.get("", response_model=FeedResponse)
async def get_feed(
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get AI-curated feed based on semantic similarity to user's goal.

    Returns top posts based on the highest semantic similarity
    to the user's current goal.

    Args:
        limit: Maximum number of posts.
        offset: Pagination offset.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Curated feed of posts.
    """
    # Check if user has bio_vector set (handle numpy array)
    if current_user.bio_vector is None or (
        hasattr(current_user.bio_vector, "__len__") and len(current_user.bio_vector) == 0
    ):
        # Return empty feed if user has no goal set
        return {
            "posts": [],
            "total_count": 0,
            "curated_by": "Set your goal to get personalized feed",
        }

    # Convert vector to string format for PostgreSQL
    vector_str = "[" + ",".join(str(v) for v in current_user.bio_vector) + "]"

    # Query posts with vector similarity and impact boost
    # Final score = (semantic_similarity * 0.8) + (impact_count_normalized * 0.2)
    # We use distance for ordering (lower is better), so we invert the formula
    # Also exclude user's own posts
    query = text(
        f"""
        SELECT 
            p.id, 
            p.author_id, 
            p.content, 
            p.impact_count, 
            p.created_at,
            p.content_vector <=> '{vector_str}'::vector as distance,
            u.username as author_username,
            u.impact_score as author_impact_score,
            u.is_focusing as author_is_focusing,
            u.current_focus_goal as author_focus_goal,
            EXISTS(
                SELECT 1 FROM interactions i 
                WHERE i.from_user_id = :user_id 
                AND i.to_user_id = p.author_id 
                AND i.type = 'impact'
            ) as is_impacted_by_me,
            (
                (1 - (p.content_vector <=> '{vector_str}'::vector)) * 0.7 +
                LEAST(u.impact_score::float / 200.0, 1.0) * 0.3
            ) as final_score
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.content_vector IS NOT NULL
        AND p.author_id != :user_id  -- Exclude own posts
        ORDER BY final_score DESC
        LIMIT :limit OFFSET :offset
        """
    )

    result = await session.execute(
        query,
        {"limit": limit, "offset": offset, "user_id": current_user.id},
    )

    posts = []
    for row in result:
        # Convert distance to similarity percentage
        similarity = round((1 - row.distance) * 100, 2)

        posts.append(
            PostResponse(
                id=row.id,
                author_id=row.author_id,
                author_username=row.author_username,
                author_impact_score=row.author_impact_score or 0,
                author_is_focusing=row.author_is_focusing or False,
                author_focus_goal=row.author_focus_goal,
                content=row.content,
                impact_count=row.impact_count,
                created_at=row.created_at,
                similarity_score=similarity,
                is_impacted_by_me=row.is_impacted_by_me,
            )
        )

    return {
        "posts": posts,
        "total_count": len(posts),
        "curated_by": current_user.current_goal or "Your interests",
    }


@router.get("/recent", response_model=list[PostResponse])
async def get_recent_feed(
    limit: int = 20,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
) -> list[PostResponse]:
    """Get recent posts (chronological, not curated).

    Args:
        limit: Maximum number of posts.
        offset: Pagination offset.
        session: Database session.

    Returns:
        List of recent posts.
    """
    query = (
        select(Post, User.username, User.impact_score)
        .join(User, Post.author_id == User.id)
        .order_by(Post.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await session.execute(query)
    posts = []

    for post, username, author_impact_score in result:
        posts.append(
            PostResponse(
                id=post.id,
                author_id=post.author_id,
                author_username=username,
                author_impact_score=author_impact_score or 0,
                content=post.content,
                impact_count=post.impact_count,
                created_at=post.created_at,
            )
        )

    return posts


@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PostResponse:
    """Create a new post with semantic embedding.

    Args:
        post_data: Post creation data.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Created post.
    """
    from app.services.embedding import get_embedding_service

    # Generate embedding for post content
    embedding_service = get_embedding_service()
    content_embedding = await embedding_service.embed_text(post_data.content)

    # Create post
    post = Post(
        author_id=current_user.id,
        content=post_data.content,
        content_vector=content_embedding,
        image_url=post_data.image_url,
    )
    session.add(post)
    await session.flush()
    await session.refresh(post)

    return PostResponse(
        id=post.id,
        author_id=post.author_id,
        author_username=current_user.username,
        author_impact_score=current_user.impact_score,
        author_is_focusing=current_user.is_focusing,
        author_focus_goal=current_user.current_focus_goal,
        content=post.content,
        image_url=post.image_url,
        impact_count=post.impact_count,
        created_at=post.created_at,
    )


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    session: AsyncSession = Depends(get_session),
) -> PostResponse:
    """Get a single post by ID.

    Args:
        post_id: Post ID.
        session: Database session.

    Returns:
        Post data.

    Raises:
        HTTPException: If post not found.
    """
    query = (
        select(Post, User.username, User.impact_score, User.is_focusing, User.current_focus_goal)
        .join(User, Post.author_id == User.id)
        .where(Post.id == post_id)
    )

    result = await session.execute(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    post, username, author_impact_score, author_is_focusing, author_focus_goal = row

    return PostResponse(
        id=post.id,
        author_id=post.author_id,
        author_username=username,
        author_impact_score=author_impact_score or 0,
        author_is_focusing=author_is_focusing or False,
        author_focus_goal=author_focus_goal,
        content=post.content,
        impact_count=post.impact_count,
        created_at=post.created_at,
    )


@router.post("/posts/{post_id}/impact", status_code=status.HTTP_201_CREATED)
async def impact_post(
    post_id: str,
    feedback: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Give impact to a post's author.

    Args:
        post_id: Post ID.
        feedback: Feedback content.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        Impact result.

    Raises:
        HTTPException: If post not found.
    """
    from app.models import Interaction
    from app.services.impact import get_impact_service

    # Find post
    query = select(Post).where(Post.id == post_id)
    result = await session.execute(query)
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Prevent self-impact
    if post.author_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot give impact to your own post",
        )

    # Check for duplicate/rapid impacts (rate limiting)
    from datetime import datetime, timedelta
    recent_query = select(Interaction).where(
        Interaction.from_user_id == current_user.id
    ).where(
        Interaction.post_id == post_id
    ).where(
        Interaction.created_at >= datetime.utcnow() - timedelta(hours=24)
    )
    recent_result = await session.execute(recent_query)
    if recent_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You've already given impact to this post recently. Please wait 24 hours.",
        )

    # Get author
    query = select(User).where(User.id == post.author_id)
    result = await session.execute(query)
    author = result.scalar_one_or_none()

    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post author not found",
        )

    # Analyze feedback
    impact_service = get_impact_service()
    is_constructive, reason = await impact_service.analyze_feedback(feedback)

    # Calculate impact points
    impact_points = impact_service.calculate_impact_points(
        is_constructive=is_constructive,
        feedback_length=len(feedback),
    )

    # Update author's impact score and post's impact count
    if impact_points > 0:
        author.impact_score += impact_points
        post.impact_count += 1
        session.add(author)
        session.add(post)

    # Create interaction record
    interaction = Interaction(
        from_user_id=current_user.id,
        to_user_id=author.id,
        post_id=post_id,
        type="impact",
        feedback_content=feedback,
        is_constructive=is_constructive,
        impact_points=impact_points,
    )
    session.add(interaction)
    await session.flush()

    return {
        "message": "Impact applied" if is_constructive else "Feedback not constructive",
        "is_constructive": is_constructive,
        "impact_points": impact_points,
        "post_impact_count": post.impact_count,
    }


@router.get("/suggested", response_model=FeedResponse)
async def get_suggested_posts(
    limit: int = 5,
    offset: int = 0,
    exclude_post_ids: str = "",  # comma-separated post IDs to exclude
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get suggested posts after giving impact - excludes recently interacted posts.
    
    Args:
        limit: Maximum number of posts.
        offset: Pagination offset.
        exclude_post_ids: Comma-separated post IDs to exclude.
        current_user: Authenticated user.
        session: Database session.
    
    Returns:
        Suggested posts for continued engagement.
    """
    from app.models import Interaction
    from datetime import datetime, timedelta
    
    # Get recently interacted post IDs
    recent_query = select(Interaction.post_id).where(
        Interaction.from_user_id == current_user.id
    ).where(
        Interaction.created_at >= datetime.utcnow() - timedelta(days=7)
    )
    recent_result = await session.execute(recent_query)
    interacted_ids = [r[0] for r in recent_result.fetchall()]
    
    # Parse excluded post IDs
    if exclude_post_ids:
        excluded = [pid.strip() for pid in exclude_post_ids.split(",") if pid.strip()]
        interacted_ids.extend(excluded)
    
    # Get posts similar to user's goal but excluding interacted ones
    if current_user.bio_vector is None or (
        hasattr(current_user.bio_vector, "__len__") and len(current_user.bio_vector) == 0
    ):
        # Return recent posts if no goal set
        query = (
            select(Post)
            .where(Post.author_id != current_user.id)
            .order_by(Post.created_at.desc())
            .limit(limit)
        )
        if interacted_ids:
            query = query.where(Post.id.not_in(interacted_ids))
        result = await session.execute(query)
        posts = result.scalars().all()
        return {
            "posts": [serialize_post(p) for p in posts],
            "total_count": len(posts),
            "curated_by": "Recent posts",
        }
    
    # Convert vector to string format
    vector_str = "[" + ",".join(str(v) for v in current_user.bio_vector) + "]"
    
    # Build exclude clause
    exclude_clause = ""
    if interacted_ids:
        placeholders = ",".join([f"'{pid}'" for pid in interacted_ids])
        exclude_clause = f"AND p.id NOT IN ({placeholders})"
    
    query = text(
        f"""
        SELECT 
            p.id, 
            p.author_id, 
            p.content, 
            p.impact_count,
            p.created_at,
            u.username,
            u.avatar_url,
            u.current_goal,
            u.is_focusing,
            1 - (p.bio_vector <=> '{vector_str}') as similarity
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.author_id != '{current_user.id}'
        {exclude_clause}
        ORDER BY similarity DESC, p.impact_count DESC
        LIMIT {limit} OFFSET {offset}
        """
    )
    result = await session.execute(query)
    rows = result.fetchall()
    
    posts = []
    for row in rows:
        post = Post(
            id=row[0],
            author_id=row[1],
            content=row[2],
            impact_count=row[3],
            created_at=row[4],
        )
        post.author = User(
            id=row[1],
            username=row[5],
            avatar_url=row[6],
            current_goal=row[7],
            is_focusing=row[8],
        )
        posts.append(post)
    
    return {
        "posts": [serialize_post(p) for p in posts],
        "total_count": len(posts),
        "curated_by": "Suggested for you",
    }


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a post (owner only).

    Args:
        post_id: Post ID.
        current_user: Authenticated user (must be post author).
        session: Database session.

    Raises:
        HTTPException: If post not found or user is not the author.
    """
    query = select(Post).where(Post.id == post_id)
    result = await session.execute(query)
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Validate ownership
    if post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own posts",
        )

    await session.delete(post)
    await session.commit()


@router.get("/posts/me", response_model=list[PostResponse])
async def get_my_posts(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[PostResponse]:
    """Get current user's posts for 'My Activity' section.

    Args:
        limit: Maximum number of posts.
        offset: Pagination offset.
        current_user: Authenticated user.
        session: Database session.

    Returns:
        List of user's own posts.
    """
    query = (
        select(Post)
        .where(Post.author_id == current_user.id)
        .order_by(Post.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await session.execute(query)
    posts = result.scalars().all()

    return [
        PostResponse(
            id=post.id,
            author_id=post.author_id,
            author_username=current_user.username,
            author_impact_score=current_user.impact_score,
            author_is_focusing=current_user.is_focusing,
            author_focus_goal=current_user.current_focus_goal,
            content=post.content,
            image_url=post.image_url,
            impact_count=post.impact_count,
            created_at=post.created_at,
        )
        for post in posts
    ]
