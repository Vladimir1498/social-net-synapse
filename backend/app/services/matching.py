"""Matching service for proximity and semantic similarity.

Combines H3 spatial indexing with vector similarity for hybrid matching.
"""

from typing import Optional

import h3
from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.services.embedding import cosine_similarity_percentage


class MatchingService:
    """Service for finding matches based on proximity and semantic similarity."""

    def __init__(self, session: AsyncSession, h3_resolution: int = 8) -> None:
        """Initialize matching service.

        Args:
            session: Database session.
            h3_resolution: H3 resolution level (default 8, ~0.46km edge length).
        """
        self.session = session
        self.h3_resolution = h3_resolution

    def lat_lon_to_h3(self, latitude: float, longitude: float) -> str:
        """Convert latitude/longitude to H3 index.

        Args:
            latitude: Latitude coordinate.
            longitude: Longitude coordinate.

        Returns:
            H3 index string.
        """
        return h3.latlng_to_cell(latitude, longitude, self.h3_resolution)

    def get_neighboring_cells(self, h3_index: str, rings: int = 1) -> list[str]:
        """Get neighboring H3 cells within specified ring distance.

        Args:
            h3_index: Center H3 cell index.
            rings: Number of rings to include (1 = immediate neighbors).

        Returns:
            List of H3 cell indices including the center cell.
        """
        neighbors = h3.grid_disk(h3_index, rings)
        return list(neighbors)

    def h3_distance(self, h3_index1: str, h3_index2: str) -> int:
        """Calculate grid distance between two H3 cells.

        Args:
            h3_index1: First H3 cell index.
            h3_index2: Second H3 cell index.

        Returns:
            Grid distance (number of cells).
        """
        return h3.grid_distance(h3_index1, h3_index2)

    async def find_nearby_users(
        self,
        user_id: str,
        h3_index: str,
        rings: int = 1,
        limit: int = 50,
    ) -> list[User]:
        """Find users in the same or neighboring H3 cells.

        Args:
            user_id: ID of the requesting user (to exclude from results).
            h3_index: H3 index to search around.
            rings: Number of H3 rings to include.
            limit: Maximum number of results.

        Returns:
            List of nearby User objects.
        """
        # Get all cells to search
        cells = self.get_neighboring_cells(h3_index, rings)

        # Query users in these cells
        query = (
            select(User)
            .where(
                and_(
                    User.id != user_id,
                    User.h3_index.in_(cells),
                    User.bio_vector.isnot(None),
                )
            )
            .limit(limit)
        )

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def find_matches(
        self,
        user_id: str,
        user_vector: list[float],
        h3_index: str,
        rings: int = 2,
        min_similarity: float = 0.0,
        limit: int = 20,
    ) -> list[dict]:
        """Find matches combining proximity and semantic similarity.

        Args:
            user_id: ID of the requesting user.
            user_vector: User's bio/goal embedding vector.
            h3_index: User's current H3 location.
            rings: Number of H3 rings to search.
            min_similarity: Minimum similarity threshold (0-100).
            limit: Maximum number of results.

        Returns:
            List of match dictionaries with user and similarity info.
        """
        # Get nearby users
        nearby_users = await self.find_nearby_users(
            user_id=user_id,
            h3_index=h3_index,
            rings=rings,
            limit=limit * 3,  # Get more to filter by similarity
        )

        # Calculate similarity for each user
        matches = []
        for user in nearby_users:
            if user.bio_vector is None:
                continue

            similarity = cosine_similarity_percentage(user_vector, user.bio_vector)

            if similarity >= min_similarity:
                distance = self.h3_distance(h3_index, user.h3_index or "")
                matches.append({
                    "user": user,
                    "similarity_percentage": similarity,
                    "h3_distance": distance,
                    "is_neighbor": distance <= 1,
                })

        # Sort by similarity (descending)
        matches.sort(key=lambda x: x["similarity_percentage"], reverse=True)

        return matches[:limit]

    async def find_semantic_matches(
        self,
        user_id: str,
        user_vector: list[float],
        limit: int = 20,
        min_similarity: float = 30.0,
    ) -> list[dict]:
        """Find matches based purely on semantic similarity (global).

        Args:
            user_id: ID of the requesting user.
            user_vector: User's bio/goal embedding vector.
            limit: Maximum number of results.
            min_similarity: Minimum similarity threshold (0-100).

        Returns:
            List of match dictionaries sorted by similarity.
        """
        # Use pgvector for similarity search
        # Convert vector to string format for PostgreSQL
        vector_str = "[" + ",".join(str(v) for v in user_vector) + "]"

        query = text(
            f"""
            SELECT id, email, username, bio, current_goal, impact_score,
                   bio_vector <=> '{vector_str}'::vector as distance
            FROM users
            WHERE id != :user_id
              AND bio_vector IS NOT NULL
            ORDER BY bio_vector <=> '{vector_str}'::vector
            LIMIT :limit
            """
        )

        result = await self.session.execute(
            query,
            {"user_id": user_id, "limit": limit * 2},
        )

        matches = []
        for row in result:
            # Convert distance to similarity percentage
            # Distance is cosine distance (0-2), convert to similarity
            similarity = round((1 - row.distance) * 100, 2)

            if similarity >= min_similarity:
                matches.append({
                    "user": {
                        "id": row.id,
                        "username": row.username,
                        "bio": row.bio,
                        "current_goal": row.current_goal,
                        "impact_score": row.impact_score,
                    },
                    "similarity_percentage": similarity,
                })

        return matches[:limit]


class LocationService:
    """Service for location-related operations."""

    def __init__(self, session: AsyncSession, h3_resolution: int = 8) -> None:
        """Initialize location service.

        Args:
            session: Database session.
            h3_resolution: H3 resolution level.
        """
        self.session = session
        self.h3_resolution = h3_resolution

    def calculate_h3_index(self, latitude: float, longitude: float) -> str:
        """Calculate H3 index from coordinates.

        Args:
            latitude: Latitude coordinate.
            longitude: Longitude coordinate.

        Returns:
            H3 index string.
        """
        return h3.latlng_to_cell(latitude, longitude, self.h3_resolution)

    async def update_user_location(
        self,
        user_id: str,
        latitude: float,
        longitude: float,
    ) -> str:
        """Update user's location and H3 index.

        Args:
            user_id: User's ID.
            latitude: New latitude.
            longitude: New longitude.

        Returns:
            New H3 index.
        """
        h3_index = self.calculate_h3_index(latitude, longitude)

        query = (
            select(User)
            .where(User.id == user_id)
        )
        result = await self.session.execute(query)
        user = result.scalar_one_or_none()

        if user:
            user.latitude = latitude
            user.longitude = longitude
            user.h3_index = h3_index
            self.session.add(user)

        return h3_index

    def get_cell_center(self, h3_index: str) -> tuple[float, float]:
        """Get the center coordinates of an H3 cell.

        Args:
            h3_index: H3 cell index.

        Returns:
            Tuple of (latitude, longitude).
        """
        return h3.cell_to_latlng(h3_index)

    def get_cell_boundary(self, h3_index: str) -> list[tuple[float, float]]:
        """Get the boundary coordinates of an H3 cell.

        Args:
            h3_index: H3 cell index.

        Returns:
            List of (latitude, longitude) tuples forming the hexagon boundary.
        """
        return h3.cell_to_boundary(h3_index)
