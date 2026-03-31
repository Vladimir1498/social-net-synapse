"""Social API routes for comments, messages, search, leaderboard, saved posts."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_session
from app.models import Comment, Message, Post, SavedPost, User, Interaction
from app.schemas import PostResponse

router = APIRouter(prefix="/social", tags=["Social"])


# ============ Online Status ============
@router.post("/heartbeat")
async def heartbeat(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Update user's last_seen to mark them as online."""
    current_user.last_seen = datetime.now(timezone.utc)
    session.add(current_user)
    await session.flush()
    return {"status": "ok", "last_seen": current_user.last_seen.isoformat()}


@router.get("/online-status/{user_id}")
async def get_online_status(
    user_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Check if a user is online (last_seen within 2 minutes)."""
    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc)
    last_seen = user.last_seen
    if last_seen is not None and last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    is_online = last_seen is not None and (now - last_seen) < timedelta(minutes=2)
    return {
        "user_id": user_id,
        "is_online": is_online,
        "last_seen": last_seen.isoformat() if last_seen else None,
    }


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
class SendMessageRequest(BaseModel):
    """Request to send a message."""
    content: str = ""
    message_type: str = "text"  # text | image | file
    file_url: str | None = None


@router.post("/messages/{user_id}")
async def send_message(
    user_id: str,
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    if not request.content and not request.file_url:
        raise HTTPException(status_code=400, detail="Message must have content or file")
    
    msg = Message(
        from_user_id=current_user.id,
        to_user_id=user_id,
        content=request.content,
        message_type=request.message_type,
        file_url=request.file_url,
    )
    session.add(msg)
    await session.flush()
    return {
        "id": msg.id,
        "from_user_id": current_user.id,
        "to_user_id": user_id,
        "content": msg.content,
        "message_type": msg.message_type,
        "file_url": msg.file_url,
        "is_read": False,
        "read_at": None,
        "created_at": msg.created_at.isoformat(),
    }


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
            m.read_at = datetime.utcnow()
            session.add(m)
    await session.flush()
    return [
        {
            "id": m.id,
            "from_user_id": m.from_user_id,
            "to_user_id": m.to_user_id,
            "content": m.content,
            "message_type": m.message_type,
            "file_url": m.file_url,
            "is_read": m.is_read,
            "read_at": m.read_at.isoformat() if m.read_at else None,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.get("/messages/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get total unread message count."""
    count = (
        await session.execute(
            select(func.count(Message.id)).where(
                Message.to_user_id == current_user.id,
                Message.is_read == False,
            )
        )
    ).scalar() or 0
    return {"unread_count": count}


@router.get("/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Get list of users the current user has messaged with, with last message."""
    # Get distinct user IDs from messages
    sent = select(Message.to_user_id).where(Message.from_user_id == current_user.id)
    received = select(Message.from_user_id).where(Message.to_user_id == current_user.id)
    user_ids_result = await session.execute(sent.union(received))
    user_ids = [r[0] for r in user_ids_result.fetchall()]

    now = datetime.now(timezone.utc)
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

        is_online = user.last_seen is not None and (now - user.last_seen) < timedelta(minutes=2)

        conversations.append({
            "user_id": uid,
            "username": user.username,
            "avatar_url": user.avatar_url,
            "last_message": last_msg.content if last_msg else "",
            "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
            "unread_count": unread,
            "is_online": is_online,
            "last_seen": user.last_seen.isoformat() if user.last_seen else None,
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
