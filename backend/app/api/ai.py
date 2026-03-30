"""AI-powered endpoints for goal decomposition and smart recommendations."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.api.auth import get_current_user
from app.database import get_session
from app.models import User, Post
from app.services.matching import MatchingService


router = APIRouter(prefix="/ai", tags=["AI"])


class SplitGoalRequest(BaseModel):
    """Request to decompose a goal into sub-tasks."""

    goal: str = Field(..., min_length=5, max_length=500)


class SplitGoalResponse(BaseModel):
    """Response with decomposed sub-tasks."""

    goal: str
    subtasks: list[str]
    total_estimated_minutes: int


# Simple heuristic-based goal decomposition
# This can be enhanced with actual LLM integration later
GOAL_PATTERNS = {
    "learn": [
        ("Break down the topic into 3 key concepts", "Focus on understanding fundamentals first", 30),
        ("Find and study 2-3 foundational resources", "Use books, courses, or documentation", 45),
        ("Practice with hands-on exercises", "Apply what you learn immediately", 30),
        ("Teach or explain to someone else", "Reinforce learning through teaching", 20),
    ],
    "build": [
        ("Define the core requirements", "Write down what you're building", 15),
        ("Create a simple prototype", "Focus on the minimum viable version", 60),
        ("Test and iterate", "Get feedback and improve", 45),
        ("Document and share", "Write about your process", 20),
    ],
    "write": [
        ("Research and gather ideas", "Collect relevant information", 30),
        ("Create an outline", "Organize your thoughts", 20),
        ("Write the first draft", "Focus on getting words down", 45),
        ("Edit and refine", "Polishing the final piece", 30),
    ],
    "startup": [
        ("Define your value proposition", "What problem do you solve?", 20),
        ("Identify your target users", "Who is your ideal customer?", 25),
        ("Build a minimum viable product", "Create something to test", 60),
        ("Get early user feedback", "Learn from real users", 30),
    ],
    "fitness": [
        ("Warm up properly", "5-10 minutes of light movement", 10),
        ("Main workout session", "Focus on form over intensity", 30),
        ("Cool down and stretch", "Prevent injury and aid recovery", 15),
        ("Track your progress", "Log your workout details", 5),
    ],
    "default": [
        ("Define clear objectives", "Know exactly what you want to achieve", 15),
        ("Break it into smaller steps", "Divide into manageable tasks", 20),
        ("Start with the most important task", "Prioritize your efforts", 40),
        ("Review and adjust", "Learn from the session", 10),
    ],
}


def decompose_goal(goal: str) -> list[str]:
    """Decompose a goal into actionable sub-tasks using pattern matching."""
    goal_lower = goal.lower()
    
    # Find matching pattern
    matched_pattern = "default"
    for key in GOAL_PATTERNS:
        if key in goal_lower:
            matched_pattern = key
            break
    
    # Generate subtasks as simple strings
    subtasks = []
    total_minutes = 0
    
    for title, description, minutes in GOAL_PATTERNS[matched_pattern]:
        subtasks.append(f"{title} - {description}")
        total_minutes += minutes
    
    return subtasks, total_minutes


@router.post("/split-goal", response_model=SplitGoalResponse)
async def split_goal(
    request: SplitGoalRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SplitGoalResponse:
    """AI-powered goal decomposition.

    Takes a user's goal and suggests 3-4 actionable sub-tasks
    based on common productivity patterns.
    """
    sub_tasks, total_minutes = decompose_goal(request.goal)
    
    return SplitGoalResponse(
        goal=request.goal,
        subtasks=sub_tasks,
        total_estimated_minutes=total_minutes,
    )


class DailyDiscoveryResponse(BaseModel):
    """Response for daily discovery recommendations."""

    users: list[dict]
    posts: list[dict]
    insights: list[str]
    based_on: str


@router.get("/daily-discovery", response_model=DailyDiscoveryResponse)
async def get_daily_discovery(
    limit: int = 3,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> DailyDiscoveryResponse:
    """Get top 3 most compatible users nearby based on H3 and semantic similarity."""
    
    if not current_user.h3_index:
        return DailyDiscoveryResponse(
            users=[],
            posts=[],
            insights=[],
            based_on="Set your location to discover nearby users",
        )
    
    if current_user.bio_vector is None:
        return DailyDiscoveryResponse(
            users=[],
            posts=[],
            insights=[],
            based_on="Set your goal to discover compatible users",
        )
    
    # Find matches using the matching service
    matching_service = MatchingService(session)
    matches = await matching_service.find_matches(
        user_id=current_user.id,
        user_vector=current_user.bio_vector,
        h3_index=current_user.h3_index,
        rings=2,  # Same cell + neighbors
        min_similarity=0,
        limit=limit,
    )
    
    # Format response
    users = []
    for match in matches[:limit]:
        user = match["user"]
        users.append({
            "id": user.id,
            "username": user.username,
            "bio": user.bio,
            "current_goal": user.current_goal,
            "impact_score": user.impact_score,
            "similarity_percentage": match["similarity_percentage"],
            "h3_distance": match["h3_distance"],
        })
    
    # Get top expert posts (highest impact score authors)
    posts_query = (
        select(Post, User.username, User.impact_score)
        .join(User, Post.author_id == User.id)
        .order_by(desc(User.impact_score), desc(Post.created_at))
        .limit(5)
    )
    posts_result = await session.execute(posts_query)
    
    posts = []
    insights = []
    expert_count = 0
    for post, username, impact_score in posts_result:
        posts.append({
            "id": post.id,
            "content": post.content,
            "author_id": post.author_id,
            "author_username": username,
            "author_impact_score": impact_score or 0,
            "created_at": post.created_at.isoformat() if post.created_at else None,
        })
        if impact_score and impact_score > 100:
            expert_count += 1
    
    # Generate insights
    if expert_count > 0:
        insights.append(f"{expert_count} experts are sharing valuable insights today!")
    if current_user.current_goal:
        insights.append(f"Focus on your goal: {current_user.current_goal}")
    insights.append("Connect with high-impact users to accelerate your growth")
    
    return DailyDiscoveryResponse(
        users=users,
        posts=posts,
        insights=insights,
        based_on=f"Matching: {current_user.current_goal or 'your interests'}",
    )
