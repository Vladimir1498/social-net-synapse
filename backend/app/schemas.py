"""Pydantic schemas for API request/response validation."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ============ User Schemas ============
class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)


class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(..., min_length=8, max_length=100)
    bio: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response."""

    id: str
    email: str
    username: str
    bio: Optional[str] = None
    current_goal: Optional[str] = None
    impact_score: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    """Public user info for matching/feed."""

    id: str
    username: str
    bio: Optional[str] = None
    current_goal: Optional[str] = None
    impact_score: int = 0
    similarity_score: Optional[float] = None

    model_config = {"from_attributes": True}


# ============ Token Schemas ============
class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: str  # user_id
    exp: datetime


# ============ Goal Schemas ============
class SyncGoalRequest(BaseModel):
    """Request to sync/update user goal."""

    goal: str = Field(..., min_length=5, max_length=500)


class SyncGoalResponse(BaseModel):
    """Response after syncing goal."""

    message: str
    goal: str
    vector_updated: bool


# ============ Location Schemas ============
class UpdateLocationRequest(BaseModel):
    """Request to update user location."""

    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class UpdateLocationResponse(BaseModel):
    """Response after updating location."""

    message: str
    h3_index: str
    latitude: float
    longitude: float


# ============ Matching Schemas ============
class MatchResult(BaseModel):
    """Single match result."""

    user: UserPublic
    similarity_percentage: float
    h3_distance: int  # Number of H3 cells away
    is_neighbor: bool


class MatchesResponse(BaseModel):
    """Response for proximity matches."""

    matches: list[MatchResult]
    total_count: int
    user_h3_index: str


# ============ Post Schemas ============
class PostCreate(BaseModel):
    """Schema for creating a post."""

    content: str = Field(..., min_length=1, max_length=2000)


class PostResponse(BaseModel):
    """Schema for post response."""

    id: str
    author_id: str
    author_username: Optional[str] = None
    content: str
    impact_count: int = 0
    created_at: datetime
    similarity_score: Optional[float] = None
    is_impacted_by_me: bool = False

    model_config = {"from_attributes": True}


class FeedResponse(BaseModel):
    """Response for AI-curated feed."""

    posts: list[PostResponse]
    total_count: int
    curated_by: str  # User's current goal


# ============ Interaction Schemas ============
class ImpactRequest(BaseModel):
    """Request to give impact/feedback."""

    to_user_id: str
    feedback_content: str = Field(..., min_length=10, max_length=1000)


class ImpactResponse(BaseModel):
    """Response after giving impact."""

    message: str
    is_constructive: bool
    impact_given: int  # Points awarded (0, 1, or 2)


class ConnectRequest(BaseModel):
    """Request to connect with another user."""

    to_user_id: str
    message: Optional[str] = None


class ConnectResponse(BaseModel):
    """Response after connection request."""

    message: str
    connection_id: str


# ============ Focus Mode Schemas ============
class FocusSessionStart(BaseModel):
    """Request to start a focus session."""

    goal: str = Field(..., min_length=5, max_length=500)


class FocusSessionResponse(BaseModel):
    """Response for focus session."""

    id: str
    goal: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    is_active: bool

    model_config = {"from_attributes": True}


# ============ WebSocket Schemas ============
class WSMessage(BaseModel):
    """WebSocket message schema."""

    type: str  # 'location_update', 'match_found', 'impact_received', etc.
    data: dict


class WSLocationUpdate(BaseModel):
    """WebSocket location update."""

    latitude: float
    longitude: float


# ============ Stats Schemas ============
class UserStats(BaseModel):
    """User statistics for dashboard."""

    impact_score: int
    connections_count: int
    posts_count: int
    focus_sessions_count: int
    total_focus_minutes: int


# ============ Health Check ============
class HealthCheck(BaseModel):
    """Health check response."""

    status: str
    version: str
    database: str
    redis: str
