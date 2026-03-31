"""Social API routes for comments, messages, search, leaderboard, saved posts."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_session
from app.models import Comment, Message, Post, SavedPost, User, Interaction
from app.schemas import PostResponse

router = APIRouter(prefix="/social", tags=["Social"])


# ============ Comments ============
@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    content: str = Query(..., min_length=1, max_length=1000),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    post = (await session.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = Comment(post_id=post_id, author_id=current_user.id, content=content)
    session.add(comment)
    await session.flush()
    return {"id": comment.id, "post_id": post_id, "author_id": current_user.id, "author_username": current_user.username, "author_avatar_url": current_user.avatar_url, "content": content, "created_at": comment.created_at.isoformat()}


@router.get("/posts/{post_id}/comments")
async def get_comments(
    post_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    query = (
        select(Comment, User.username, User.avatar_url)
        .join(User, Comment.author_id == User.id)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.desc())
        .limit(limit).offset(offset)
    )
    result = await session.execute(query)
    return [
        {"id": c.id, "post_id": c.post_id, "author_id": c.author_id, "author_username": u, "author_avatar_url": a, "content": c.content, "created_at": c.created_at.isoformat()}
        for c, u, a in result
    ]


# ============ Messages ============
@router.post("/messages/{user_id}")
async def send_message(
    user_id: str,
    content: str = Query(..., min_length=1, max_length=2000),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    msg = Message(from_user_id=current_user.id, to_user_id=user_id, content=content)
    session.add(msg)
    await session.flush()
    return {"id": msg.id, "from_user_id": current_user.id, "to_user_id": user_id, "content": content, "is_read": False, "created_at": msg.created_at.isoformat()}


@router.get("/messages/{user_id}")
async def get_messages(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    query = (
        select(Message)
        .where(
            or_(
                (Message.from_user_id == current_user.id) & (Message.to_user_id == user_id),
                (Message.from_user_id == user_id) & (Message.to_user_id == current_user.id),
            )
        )
        .order_by(Message.created_at.asc())
        .limit(limit).offset(offset)
    )
    result = await session.execute(query)
    messages = result.scalars().all()
    # Mark unread messages as read
    for m in messages:
        if m.to_user_id == current_user.id and not m.is_read:
            m.is_read = True
            session.add(m)
    await session.flush()
    return [
        {"id": m.id, "from_user_id": m.from_user_id, "to_user_id": m.to_user_id, "content": m.content, "is_read": m.is_read, "created_at": m.created_at.isoformat()}
        for m in messages
    ]


@router.get("/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Get list of users the current user has messaged with, with last message."""
    from sqlalchemy import case
    query = text if False else None  # placeholder

    # Get distinct user IDs from messages
    sent = select(Message.to_user_id).where(Message.from_user_id == current_user.id)
    received = select(Message.from_user_id).where(Message.to_user_id == current_user.id)

    user_ids_result = await session.execute(sent.union(received))
    user_ids = [r[0] for r in user_ids_result.fetchall()]

    conversations = []
    for uid in user_ids:
        user = (await session.execute(select(User).where(User.id == uid))).scalar_one_or_none()
        if not user:
            continue
        last_msg = (
            await session.execute(
                select(Message)
                .where(
                    or_(
                        (Message.from_user_id == current_user.id) & (Message.to_user_id == uid),
                        (Message.from_user_id == uid) & (Message.to_user_id == current_user.id),
                    )
                )
                .order_by(Message.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        unread = (
            await session.execute(
                select(func.count(Message.id))
                .where(Message.from_user_id == uid, Message.to_user_id == current_user.id, Message.is_read == False)
            )
        ).scalar() or 0

        conversations.append({
            "user_id": uid,
            "username": user.username,
            "avatar_url": user.avatar_url,
            "last_message": last_msg.content if last_msg else "",
            "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
            "unread_count": unread,
        })

    conversations.sort(key=lambda c: c["last_message_at"] or "", reverse=True)
    return conversations


# ============ Search ============
@router.get("/search")
async def search(
    q: str = Query(..., min_length=2, max_length=100),
    type: str = Query("all", pattern="^(all|users|posts)$"),
    limit: int = Query(20, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> dict:
    results = {"users": [], "posts": []}

    if type in ("all", "users"):
        users_q = (
            select(User)
            .where(or_(User.username.ilike(f"%{q}%"), User.bio.ilike(f"%{q}%")))
            .limit(limit)
        )
        users = (await session.execute(users_q)).scalars().all()
        results["users"] = [
            {"id": u.id, "username": u.username, "avatar_url": u.avatar_url, "bio": u.bio, "current_goal": u.current_goal, "impact_score": u.impact_score}
            for u in users
        ]

    if type in ("all", "posts"):
        posts_q = (
            select(Post, User.username, User.avatar_url)
            .join(User, Post.author_id == User.id)
            .where(Post.content.ilike(f"%{q}%"))
            .order_by(Post.created_at.desc())
            .limit(limit)
        )
        posts = (await session.execute(posts_q)).all()
        results["posts"] = [
            {"id": p.id, "author_id": p.author_id, "author_username": u, "author_avatar_url": a, "content": p.content, "image_url": p.image_url, "impact_count": p.impact_count, "created_at": p.created_at.isoformat()}
            for p, u, a in posts
        ]

    return results


# ============ Leaderboard ============
@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    query = (
        select(User.id, User.username, User.avatar_url, User.current_goal, User.impact_score, User.is_focusing)
        .order_by(User.impact_score.desc())
        .limit(limit)
    )
    result = await session.execute(query)
    return [
        {"rank": i + 1, "id": r[0], "username": r[1], "avatar_url": r[2], "current_goal": r[3], "impact_score": r[4], "is_focusing": r[5]}
        for i, r in enumerate(result)
    ]


# ============ Saved Posts ============
@router.post("/saved/{post_id}")
async def save_post(
    post_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    existing = (await session.execute(
        select(SavedPost).where(SavedPost.user_id == current_user.id, SavedPost.post_id == post_id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already saved")

    post = (await session.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    saved = SavedPost(user_id=current_user.id, post_id=post_id)
    session.add(saved)
    await session.flush()
    return {"id": saved.id, "post_id": post_id}


@router.delete("/saved/{post_id}")
async def unsave_post(
    post_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    saved = (await session.execute(
        select(SavedPost).where(SavedPost.user_id == current_user.id, SavedPost.post_id == post_id)
    )).scalar_one_or_none()
    if saved:
        await session.delete(saved)
        await session.flush()
    return {"message": "Removed"}


@router.get("/saved")
async def get_saved_posts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    query = (
        select(Post, User.username, User.avatar_url, SavedPost.created_at.label("saved_at"))
        .join(SavedPost, SavedPost.post_id == Post.id)
        .join(User, Post.author_id == User.id)
        .where(SavedPost.user_id == current_user.id)
        .order_by(SavedPost.created_at.desc())
        .limit(limit).offset(offset)
    )
    result = await session.execute(query)
    return [
        {"id": p.id, "author_id": p.author_id, "author_username": u, "author_avatar_url": a, "content": p.content, "image_url": p.image_url, "impact_count": p.impact_count, "created_at": p.created_at.isoformat()}
        for p, u, a, _ in result
    ]
