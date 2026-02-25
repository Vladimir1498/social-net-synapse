"""Embedding service for text-to-vector conversion.

Supports two providers:
- local: Uses fastembed with BAAI/bge-small-en-v1.5 (384 dimensions)
- openai: Uses OpenAI text-embedding-3-small (1536 dimensions)
"""

from abc import ABC, abstractmethod
from typing import Literal

import numpy as np
from fastembed import TextEmbedding

from app.config import get_settings

settings = get_settings()


class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers."""

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Generate embedding vector for text."""
        pass

    @abstractmethod
    def get_dimension(self) -> int:
        """Return the dimension of the embedding vectors."""
        pass


class LocalEmbeddingProvider(EmbeddingProvider):
    """Local embedding provider using fastembed."""

    def __init__(self) -> None:
        """Initialize local embedding model."""
        # Use BAAI/bge-small-en-v1.5 for fast, quality embeddings
        self.model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        self._dimension = 384

    async def embed(self, text: str) -> list[float]:
        """Generate embedding using local model.

        Args:
            text: Input text to embed.

        Returns:
            List of floats representing the embedding vector.
        """
        # fastembed returns a generator, we take the first result
        embeddings = list(self.model.embed([text]))
        return embeddings[0].tolist()

    def get_dimension(self) -> int:
        """Return embedding dimension (384 for bge-small)."""
        return self._dimension


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI embedding provider."""

    def __init__(self, api_key: str) -> None:
        """Initialize OpenAI client.

        Args:
            api_key: OpenAI API key.
        """
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(api_key=api_key)
        self._dimension = 1536  # text-embedding-3-small

    async def embed(self, text: str) -> list[float]:
        """Generate embedding using OpenAI API.

        Args:
            text: Input text to embed.

        Returns:
            List of floats representing the embedding vector.
        """
        response = await self.client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding

    def get_dimension(self) -> int:
        """Return embedding dimension (1536 for text-embedding-3-small)."""
        return self._dimension


class EmbeddingService:
    """Main embedding service that delegates to appropriate provider."""

    def __init__(
        self,
        provider: Literal["local", "openai"] = "local",
        openai_api_key: str | None = None,
    ) -> None:
        """Initialize embedding service with specified provider.

        Args:
            provider: Embedding provider type ('local' or 'openai').
            openai_api_key: OpenAI API key (required if provider is 'openai').
        """
        self._provider: EmbeddingProvider

        if provider == "openai":
            if not openai_api_key:
                raise ValueError("OpenAI API key is required for OpenAI provider")
            self._provider = OpenAIEmbeddingProvider(api_key=openai_api_key)
        else:
            self._provider = LocalEmbeddingProvider()

    async def embed_text(self, text: str) -> list[float]:
        """Generate embedding for a single text.

        Args:
            text: Input text to embed.

        Returns:
            List of floats representing the embedding vector.
        """
        return await self._provider.embed(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed.

        Returns:
            List of embedding vectors.
        """
        # For now, process sequentially. Could be parallelized.
        embeddings = []
        for text in texts:
            embedding = await self.embed_text(text)
            embeddings.append(embedding)
        return embeddings

    def get_dimension(self) -> int:
        """Get the dimension of embedding vectors."""
        return self._provider.get_dimension()


def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    """Calculate cosine similarity between two vectors.

    Args:
        vec1: First vector.
        vec2: Second vector.

    Returns:
        Cosine similarity score between -1 and 1.
    """
    a = np.array(vec1)
    b = np.array(vec2)

    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(dot_product / (norm_a * norm_b))


def cosine_similarity_percentage(vec1: list[float], vec2: list[float]) -> float:
    """Calculate cosine similarity as percentage (0-100).

    Args:
        vec1: First vector.
        vec2: Second vector.

    Returns:
        Similarity percentage between 0 and 100.
    """
    similarity = cosine_similarity(vec1, vec2)
    # Convert from [-1, 1] to [0, 100]
    return round((similarity + 1) * 50, 2)


# Global embedding service instance
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """Get or create the global embedding service instance."""
    global _embedding_service

    if _embedding_service is None:
        _embedding_service = EmbeddingService(
            provider=settings.embedding_provider,
            openai_api_key=settings.openai_api_key,
        )

    return _embedding_service
