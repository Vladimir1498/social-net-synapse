"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    database_url: str = "postgresql+asyncpg://synapse:synapse_secret@localhost:5432/synapse_db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = "synapse_jwt_secret_key_2024"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24 * 7  # 7 days

    # Embedding Configuration
    embedding_provider: Literal["local", "openai"] = "local"
    openai_api_key: str | None = None
    embedding_dimension: int = 384  # 384 for local (fastembed), 1536 for OpenAI

    # H3 Configuration
    h3_resolution: int = 8  # Resolution for spatial indexing

    # CORS
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # App
    app_name: str = "Synapse"
    app_version: str = "0.1.0"
    debug: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
