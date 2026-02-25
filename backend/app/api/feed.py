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
            EXISTS(
                SELECT 1 FROM interactions i 
                WHERE i.from_user_id = :user_id 
                AND i.to_user_id = p.author_id 
                AND i.type = 'impact'
            ) as is_impacted_by_me,
            (
                (1 - (p.content_vector <=> '{vector_str}'::vector)) * 0.8 +
                LEAST(p.impact_count::float / 10.0, 1.0) * 0.2
            ) as final_score
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.content_vector IS NOT NULL
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
        select(Post, User.username)
        .join(User, Post.author_id == User.id)
        .order_by(Post.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await session.execute(query)
    posts = []

    for post, username in result:
        posts.append(
            PostResponse(
                id=post.id,
                author_id=post.author_id,
                author_username=username,
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
    )
    session.add(post)
    await session.flush()
    await session.refresh(post)

    return PostResponse(
        id=post.id,
        author_id=post.author_id,
        author_username=current_user.username,
        content=post.content,
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
        select(Post, User.username)
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

    post, username = row

    return PostResponse(
        id=post.id,
        author_id=post.author_id,
        author_username=username,
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
        type="impact",
        feedback_content=feedback,
        is_constructive=is_constructive,
    )
    session.add(interaction)
    await session.flush()

    return {
        "message": "Impact applied" if is_constructive else "Feedback not constructive",
        "is_constructive": is_constructive,
        "impact_points": impact_points,
        "post_impact_count": post.impact_count,
    }
