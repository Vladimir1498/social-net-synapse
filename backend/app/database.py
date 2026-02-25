"""Database connection and session management."""

from collections.abc import AsyncGenerator
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

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


def add_connect_timeout(url: str, timeout: int = 30) -> str:
    """Add timeout to URL (asyncpg uses 'timeout', not 'connect_timeout')."""
    parsed = urlparse(url)
    qs = dict(parse_qsl(parsed.query, keep_blank_values=True))
    # Remove old connect_timeout if present (user might have added it in Render env)
    qs.pop("connect_timeout", None)
    qs.pop("timeout", None)
    # Add new timeout
    qs["timeout"] = str(timeout)
    new_query = urlencode(qs)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))


# Add connect_timeout to URL
db_url = add_connect_timeout(db_url, timeout=30)

# Create async engine with proper timeout and pool settings
engine = create_async_engine(
    db_url,
    echo=settings.debug,
    future=True,
    pool_pre_ping=True,
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
        # Create pgvector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        
        # Create tables
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # Create vector index for similarity search
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
        # Create H3 index for spatial queries
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS users_h3_idx ON users (h3_index)"
            )
        )


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
