"""Database models using SQLModel with pgvector support."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Float, Index, Integer, String, Text, func
from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
    """User model with semantic profile and location data."""

    __tablename__ = "users"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        unique=True,
        index=True,
    )
    email: str = Field(unique=True, index=True, max_length=255)
    username: str = Field(unique=True, index=True, max_length=100)
    hashed_password: str = Field(max_length=255)
    
    # Profile
    bio: Optional[str] = Field(default=None, sa_column=Column(Text))
    current_goal: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # Semantic Vector (stored as pgvector)
    bio_vector: Optional[list[float]] = Field(
        default=None,
        sa_column=Column(Vector(384)),  # 384 for local embeddings, 1536 for OpenAI
    )
    
    # Location (H3 spatial indexing)
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    h3_index: Optional[str] = Field(default=None, max_length=50, index=True)
    
    # Impact Score (replaces likes)
    impact_score: int = Field(default=0)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
    
    # Relationships
    posts: list["Post"] = Relationship(back_populates="author")
    interactions_from: list["Interaction"] = Relationship(
        back_populates="from_user",
        sa_relationship_kwargs={"foreign_keys": "Interaction.from_user_id"},
    )
    interactions_to: list["Interaction"] = Relationship(
        back_populates="to_user",
        sa_relationship_kwargs={"foreign_keys": "Interaction.to_user_id"},
    )


class Post(SQLModel, table=True):
    """Post model with semantic content vector."""

    __tablename__ = "posts"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        unique=True,
        index=True,
    )
    author_id: str = Field(foreign_key="users.id", index=True)
    
    # Content
    content: str = Field(sa_column=Column(Text))
    content_vector: Optional[list[float]] = Field(
        default=None,
        sa_column=Column(Vector(384)),
    )
    
    # Metadata
    impact_count: int = Field(default=0)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
    
    # Relationships
    author: Optional[User] = Relationship(back_populates="posts")


class Interaction(SQLModel, table=True):
    """Interaction model for impact and connections."""

    __tablename__ = "interactions"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        unique=True,
        index=True,
    )
    from_user_id: str = Field(foreign_key="users.id", index=True)
    to_user_id: str = Field(foreign_key="users.id", index=True)
    
    # Interaction type
    type: str = Field(max_length=20)  # 'impact' | 'connect' | 'feedback'
    
    # Feedback content (for impact verification)
    feedback_content: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_constructive: Optional[bool] = Field(default=None)
    
    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    from_user: Optional[User] = Relationship(
        back_populates="interactions_from",
        sa_relationship_kwargs={"foreign_keys": "[Interaction.from_user_id]"},
    )
    to_user: Optional[User] = Relationship(
        back_populates="interactions_to",
        sa_relationship_kwargs={"foreign_keys": "[Interaction.to_user_id]"},
    )


class FocusSession(SQLModel, table=True):
    """Focus session for tracking user productivity."""

    __tablename__ = "focus_sessions"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        unique=True,
        index=True,
    )
    user_id: str = Field(foreign_key="users.id", index=True)
    
    # Session data
    goal: str = Field(sa_column=Column(Text))
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = Field(default=None)
    duration_minutes: Optional[int] = Field(default=None)
    
    # Status
    is_active: bool = Field(default=True)


# Create vector similarity index for users
# Note: This is a placeholder - actual index creation happens in migrations
