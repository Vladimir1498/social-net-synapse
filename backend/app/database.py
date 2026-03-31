"""Database connection and session management."""

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.config import get_settings

settings = get_settings()

# Convert postgresql:// to postgresql+asyncpg:// for asyncpg driver
db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create async engine
engine = create_async_engine(
    db_url,
    echo=settings.debug,
    future=True,
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Initialize database with extensions and tables."""
    async with engine.begin() as conn:
        # Try to create pgvector extension (may not be available on all hosts)
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception:
            pass  # pgvector not available, vector indexes will be skipped

        # Create tables
        await conn.run_sync(SQLModel.metadata.create_all)

        # Add missing columns for existing databases (migrations)
        migrations = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)",
            "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS post_id VARCHAR",
            "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS impact_points INTEGER DEFAULT 0",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url VARCHAR(500)",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text'",
            "ALTER TABLE messages ALTER COLUMN content SET DEFAULT ''",
            "CREATE INDEX IF NOT EXISTS ix_interactions_post_id ON interactions (post_id)",
            "CREATE TABLE IF NOT EXISTS saved_posts (id VARCHAR PRIMARY KEY, user_id VARCHAR, post_id VARCHAR, created_at TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS comments (id VARCHAR PRIMARY KEY, post_id VARCHAR, author_id VARCHAR, content TEXT, created_at TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS messages (id VARCHAR PRIMARY KEY, from_user_id VARCHAR, to_user_id VARCHAR, content TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP)",
            "CREATE INDEX IF NOT EXISTS ix_saved_posts_user_id ON saved_posts (user_id)",
            "CREATE INDEX IF NOT EXISTS ix_saved_posts_post_id ON saved_posts (post_id)",
            "CREATE INDEX IF NOT EXISTS ix_comments_post_id ON comments (post_id)",
            "CREATE INDEX IF NOT EXISTS ix_comments_author_id ON comments (author_id)",
            "CREATE INDEX IF NOT EXISTS ix_messages_from_user_id ON messages (from_user_id)",
            "CREATE INDEX IF NOT EXISTS ix_messages_to_user_id ON messages (to_user_id)",
            "CREATE INDEX IF NOT EXISTS ix_messages_created_at ON messages (created_at)",
            "CREATE INDEX IF NOT EXISTS ix_users_last_seen ON users (last_seen)",
        ]
        for migration in migrations:
            try:
                await conn.execute(text(migration))
            except Exception:
                pass

        # Create vector indexes for similarity search (only if pgvector is available)
        try:
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS users_bio_vector_idx "
                    "ON users USING ivfflat (bio_vector vector_cosine_ops) "
                    "WITH (lists = 100)"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS posts_content_vector_idx "
                    "ON posts USING ivfflat (content_vector vector_cosine_ops) "
                    "WITH (lists = 100)"
                )
            )
        except Exception:
            pass  # pgvector indexes not available

        # Create H3 index for spatial queries
        try:
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS users_h3_idx ON users (h3_index)"
                )
            )
        except Exception:
            pass


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
