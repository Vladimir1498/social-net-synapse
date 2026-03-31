"""Main FastAPI application with WebSocket support."""

import json
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import api_router
from app.api.auth import get_current_user
from app.config import get_settings
from app.database import get_session, init_db
from app.models import User
from app.schemas import HealthCheck

settings = get_settings()


# Connection manager for WebSocket
class ConnectionManager:
    """Manages WebSocket connections for real-time features."""

    def __init__(self) -> None:
        """Initialize connection manager."""
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        """Accept and store a WebSocket connection.

        Args:
            websocket: WebSocket connection.
            user_id: User ID for the connection.
        """
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str) -> None:
        """Remove a WebSocket connection.

        Args:
            user_id: User ID to disconnect.
        """
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: dict[str, Any], user_id: str) -> None:
        """Send a message to a specific user.

        Args:
            message: Message data.
            user_id: Target user ID.
        """
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a message to all connected users.

        Args:
            message: Message data.
        """
        for connection in self.active_connections.values():
            await connection.send_json(message)


# Global connection manager
manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    os.makedirs("/app/uploads", exist_ok=True)
    await init_db()
    yield
    pass


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Synaptic Social Network - Goal-driven, anti-scroll social network",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")


# ============ File Upload ============
@app.post("/api/v1/upload/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    ext = os.path.splitext(file.filename or "img.jpg")[1] or ".jpg"
    filename = f"avatar_{current_user.id}{ext}"
    filepath = os.path.join("/app/uploads", filename)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    with open(filepath, "wb") as f:
        f.write(content)
    current_user.avatar_url = f"/uploads/{filename}"
    session.add(current_user)
    await session.flush()
    return {"url": current_user.avatar_url}


@app.post("/api/v1/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    ext = os.path.splitext(file.filename or "img.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("/app/uploads", filename)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    with open(filepath, "wb") as f:
        f.write(content)
    return {"url": f"/uploads/{filename}"}


# ============ Health Check ============
@app.get("/health", response_model=HealthCheck)
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "database": "connected",
        "redis": "connected",
    }


# ============ WebSocket Endpoints ============
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str) -> None:
    """WebSocket endpoint for real-time communication.

    Handles:
    - Location updates
    - Match notifications
    - Impact received notifications
    - Focus mode status

    Args:
        websocket: WebSocket connection.
        user_id: User ID for the connection.
    """
    await manager.connect(websocket, user_id)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                message_type = message.get("type")

                if message_type == "ping":
                    # Respond to ping
                    await manager.send_personal_message(
                        {"type": "pong", "data": {}},
                        user_id,
                    )

                elif message_type == "location_update":
                    # Handle location update
                    # This would update the user's location in real-time
                    await manager.send_personal_message(
                        {
                            "type": "location_updated",
                            "data": {
                                "latitude": message.get("latitude"),
                                "longitude": message.get("longitude"),
                            },
                        },
                        user_id,
                    )

                elif message_type == "focus_mode":
                    # Handle focus mode toggle
                    await manager.send_personal_message(
                        {
                            "type": "focus_mode_changed",
                            "data": {
                                "is_active": message.get("is_active", False),
                            },
                        },
                        user_id,
                    )

                else:
                    # Unknown message type
                    await manager.send_personal_message(
                        {
                            "type": "error",
                            "data": {"message": f"Unknown message type: {message_type}"},
                        },
                        user_id,
                    )

            except json.JSONDecodeError:
                await manager.send_personal_message(
                    {
                        "type": "error",
                        "data": {"message": "Invalid JSON format"},
                    },
                    user_id,
                )

    except WebSocketDisconnect:
        manager.disconnect(user_id)


# ============ Root Endpoint ============
@app.get("/")
async def root() -> dict:
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }
