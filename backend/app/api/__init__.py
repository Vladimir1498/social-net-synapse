"""API routes package."""

from fastapi import APIRouter

from app.api.ai import router as ai_router
from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.feed import router as feed_router
from app.api.matching import router as matching_router
from app.api.social import router as social_router
from app.api.users import router as users_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(matching_router)
api_router.include_router(feed_router)
api_router.include_router(ai_router)
api_router.include_router(analytics_router)
api_router.include_router(social_router)
