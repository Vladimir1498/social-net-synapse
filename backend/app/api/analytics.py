"""Analytics endpoints for skill mapping and user insights."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, timedelta
from uuid import uuid4

from app.api.auth import get_current_user
from app.database import get_session
from app.models import User, Post, FocusSession, Interaction
from app.services.matching import MatchingService


router = APIRouter(prefix="/analytics", tags=["Analytics"])


class SkillCategory(BaseModel):
    """A skill category with its score."""

    skill: str
    score: float
    post_count: int


class SkillMapResponse(BaseModel):
    """Response with user's skill map."""

    skills: list[SkillCategory]
    total_impact: int
    focus_minutes: int
    streak_days: int


# Keyword-based skill categorization
SKILL_KEYWORDS = {
    "Technology": ["python", "code", "programming", "api", "web", "app", "software", "tech", "data", "ai", "machine learning", "database", "backend", "frontend"],
    "Design": ["design", "ui", "ux", "visual", "brand", "logo", "graphic", "creative", "figma", "illustrator"],
    "Marketing": ["marketing", "seo", "content", "social media", "brand", "growth", "campaign", "advertising"],
    "Business": ["business", "startup", "entrepreneur", "strategy", "revenue", "customer", "sales", "pitch", "founder"],
    "Product": ["product", "feature", "roadmap", "user research", "mvp", "prototype", "testing"],
    "Writing": ["write", "blog", "article", "book", "content", "copy", "documentation", "story"],
    "Learning": ["learn", "course", "study", "tutorial", "education", "practice", "skill"],
    "Fitness": ["fitness", "workout", "exercise", "health", "gym", "running", "yoga", "training"],
    "Finance": ["finance", "investment", "budget", "money", "funding", "pricing", "cost", "roi"],
    "Leadership": ["team", "lead", "mentor", "coach", "culture", "hiring", "management", "collaboration"],
}


def categorize_skill_keywords(content: str) -> list[str]:
    """Categorize content based on keywords."""
    content_lower = content.lower()
    matched_categories = []
    
    for category, keywords in SKILL_KEYWORDS.items():
        for keyword in keywords:
            if keyword in content_lower:
                matched_categories.append(category)
                break
    
    return matched_categories if matched_categories else ["General"]


@router.get("/skill-map", response_model=SkillMapResponse)
async def get_skill_map(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SkillMapResponse:
    """Get user's skill map based on their posts and interactions."""
    
    # Get all posts by user
    posts_result = await session.execute(
        select(Post).where(Post.author_id == current_user.id)
    )
    user_posts = posts_result.scalars().all()
    
    # Get impact received on posts
    post_ids = [p.id for p in user_posts]
    if post_ids:
        impact_result = await session.execute(
            select(func.count(Interaction.id), func.sum(Interaction.impact_points))
            .where(Interaction.post_id.in_(post_ids))
            .where(Interaction.impact_points != None)
        )
        impact_row = impact_result.first()
        impact_count = impact_row[0] if impact_row else 0
        total_impact = impact_row[1] if impact_row and impact_row[1] else 0
    else:
        total_impact = 0
    
    # Get total focus minutes
    focus_result = await session.execute(
        select(func.sum(FocusSession.duration_minutes))
        .where(FocusSession.user_id == current_user.id)
        .where(FocusSession.duration_minutes != None)
    )
    total_focus_minutes = focus_result.scalar() or 0
    
    # Get streak (consecutive days with focus sessions)
    dates_result = await session.execute(
        select(func.date(FocusSession.start_time).label("date"))
        .where(FocusSession.user_id == current_user.id)
        .distinct()
        .order_by(func.date(FocusSession.start_time).desc())
        .limit(30)
    )
    focus_dates = [row.date for row in dates_result.fetchall()]
    
    streak_days = 0
    if focus_dates:
        today = datetime.utcnow().date()
        check_date = today
        
        for date in focus_dates:
            if date == check_date or date == check_date - timedelta(days=1):
                streak_days += 1
                check_date = date
            else:
                break
    
    # Categorize posts by skills
    skill_scores: dict[str, float] = {}
    skill_counts: dict[str, int] = {}
    
    for post in user_posts:
        categories = categorize_skill_keywords(post.content or "")
        post_impact = 1
        
        for category in categories:
            skill_scores[category] = skill_scores.get(category, 0) + post_impact
            skill_counts[category] = skill_counts.get(category, 0) + 1
    
    # Convert to list and normalize scores (0-100)
    skills = []
    max_score = max(skill_scores.values()) if skill_scores else 1
    
    for skill, score in skill_scores.items():
        normalized_score = (score / max_score) * 100
        skills.append(SkillCategory(
            skill=skill,
            score=round(normalized_score, 1),
            post_count=skill_counts.get(skill, 0)
        ))
    
    # Sort by score descending
    skills.sort(key=lambda x: x.score, reverse=True)
    
    return SkillMapResponse(
        skills=skills[:10],
        total_impact=int(total_impact),
        focus_minutes=int(total_focus_minutes),
        streak_days=streak_days,
    )


class KnowledgeEntry(BaseModel):
    """A saved knowledge entry."""

    id: str
    post_id: str
    user_id: str
    content: str
    author_username: str
    saved_at: datetime


class SaveKnowledgeRequest(BaseModel):
    """Request to save a post to knowledge base."""

    post_id: str


class KnowledgeBaseResponse(BaseModel):
    """Response with user's knowledge base entries."""

    entries: list[KnowledgeEntry]
    total_count: int


# In-memory storage for knowledge base
knowledge_base_storage: dict[str, list[dict]] = {}


@router.post("/knowledge/save")
async def save_to_knowledge_base(
    request: SaveKnowledgeRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Save a post to user's private knowledge base."""
    
    # Get the post
    post_result = await session.execute(
        select(Post, User.username)
        .join(User, Post.author_id == User.id)
        .where(Post.id == request.post_id)
    )
    row = post_result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post, author_username = row
    
    # Initialize user's knowledge base if not exists
    if current_user.id not in knowledge_base_storage:
        knowledge_base_storage[current_user.id] = []
    
    # Check if already saved
    existing = [e for e in knowledge_base_storage[current_user.id] if e["post_id"] == request.post_id]
    if existing:
        raise HTTPException(status_code=400, detail="Already saved to knowledge base")
    
    # Add to knowledge base
    entry = {
        "id": str(uuid4()),
        "post_id": request.post_id,
        "user_id": current_user.id,
        "content": post.content,
        "author_username": author_username,
        "saved_at": datetime.utcnow().isoformat(),
    }
    knowledge_base_storage[current_user.id].append(entry)
    
    return {"message": "Saved to knowledge base", "entry_id": entry["id"]}


@router.get("/knowledge", response_model=KnowledgeBaseResponse)
async def get_knowledge_base(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> KnowledgeBaseResponse:
    """Get user's knowledge base entries."""
    
    entries = knowledge_base_storage.get(current_user.id, [])
    
    return KnowledgeBaseResponse(
        entries=[KnowledgeEntry(**e) for e in entries],
        total_count=len(entries),
    )


class StreakResponse(BaseModel):
    """Focus streak information."""

    current_streak: int
    longest_streak: int
    total_focus_days: int


@router.get("/streak", response_model=StreakResponse)
async def get_focus_streak(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StreakResponse:
    """Get user's focus streak information."""
    
    result = await session.execute(
        select(func.date(FocusSession.start_time).label("date"))
        .where(FocusSession.user_id == current_user.id)
        .distinct()
        .order_by(func.date(FocusSession.start_time).desc())
    )
    focus_dates = [row.date for row in result.fetchall()]
    
    if not focus_dates:
        return StreakResponse(
            current_streak=0,
            longest_streak=0,
            total_focus_days=0,
        )
    
    # Calculate current streak
    today = datetime.utcnow().date()
    current_streak = 0
    check_date = today
    
    for date in focus_dates:
        if date == check_date or date == check_date - timedelta(days=1):
            current_streak += 1
            check_date = date
        else:
            break
    
    # Calculate longest streak
    longest_streak = 0
    temp_streak = 1
    
    sorted_dates = sorted(focus_dates)
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i-1]).days == 1:
            temp_streak += 1
        else:
            longest_streak = max(longest_streak, temp_streak)
            temp_streak = 1
    longest_streak = max(longest_streak, temp_streak)
    
    return StreakResponse(
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_focus_days=len(focus_dates),
    )


@router.get("/focusing-now")
async def get_focusing_now(
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get count of currently active focus sessions."""
    from datetime import datetime
    
    result = await session.execute(
        select(func.count(FocusSession.id))
        .where(FocusSession.is_active == True)
        .where(FocusSession.start_time >= datetime.utcnow() - timedelta(hours=24))
    )
    count = result.scalar() or 0
    
    return {"count": count}


class ImpactHistoryEntry(BaseModel):
    """An impact history entry."""

    id: str
    type: str  # "given" or "received"
    target_username: str  # For given impacts
    source_username: str  # For received impacts
    feedback_content: str
    impact_points: int
    is_constructive: bool
    created_at: datetime


class ImpactHistoryResponse(BaseModel):
    """Response with user's impact history."""

    given: list[ImpactHistoryEntry]
    received: list[ImpactHistoryEntry]
    total_given: int
    total_received: int


@router.get("/impact-history", response_model=ImpactHistoryResponse)
async def get_impact_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ImpactHistoryResponse:
    """Get user's impact history - both given and received."""
    
    # Get impacts given by user
    given_query = (
        select(Interaction, User.username)
        .join(User, Interaction.to_user_id == User.id)
        .where(Interaction.from_user_id == current_user.id)
        .where(Interaction.type == "impact")
        .order_by(Interaction.created_at.desc())
        .limit(limit)
    )
    given_result = await session.execute(given_query)
    given_rows = given_result.all()
    
    given = []
    for row in given_rows:
        interaction, username = row
        # Estimate impact points (simplified)
        points = 5 if interaction.is_constructive else 0
        given.append(ImpactHistoryEntry(
            id=str(interaction.id),
            type="given",
            target_username=username,
            source_username="",
            feedback_content=interaction.feedback_content or "",
            impact_points=points,
            is_constructive=interaction.is_constructive,
            created_at=interaction.created_at,
        ))
    
    # Get impacts received by user
    received_query = (
        select(Interaction, User.username)
        .join(User, Interaction.from_user_id == User.id)
        .where(Interaction.to_user_id == current_user.id)
        .where(Interaction.type == "impact")
        .order_by(Interaction.created_at.desc())
        .limit(limit)
    )
    received_result = await session.execute(received_query)
    received_rows = received_result.all()
    
    received = []
    for row in received_rows:
        interaction, username = row
        # Estimate impact points
        points = 5 if interaction.is_constructive else 0
        received.append(ImpactHistoryEntry(
            id=str(interaction.id),
            type="received",
            target_username="",
            source_username=username,
            feedback_content=interaction.feedback_content or "",
            impact_points=points,
            is_constructive=interaction.is_constructive,
            created_at=interaction.created_at,
        ))
    
    return ImpactHistoryResponse(
        given=given,
        received=received,
        total_given=len(given),
        total_received=len(received),
    )
