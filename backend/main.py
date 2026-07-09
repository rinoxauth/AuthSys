from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from core.config import settings
from core.limiter import limiter
from routers import (
    developer_auth, client_api, developer_apps, developer_keys,
    developer_users, blacklist, admin, developer_analytics,
    variables, webhooks, ai_chat, billing, developer_team, developer_bots,
    discord_interactions, chatrooms, seller_api, developer_responses, pricing,
    developer_notifications,
    developer_sessions, developer_security, developer_domains,
    developer_backups, developer_environments, developer_health,
    developer_organization, developer_usage, developer_scheduled,
    admin_custom_plans, oauth,
)
import asyncio
import logging
import os
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Setup SlowAPI Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def startup_event():
    try:
        from core.database import AsyncSessionLocal, create_tables
        from services.bootstrap import run_bootstrap

        # Create all tables automatically
        await create_tables()
        logger.info("Database tables created successfully")

        async with AsyncSessionLocal() as db:
            result = await run_bootstrap(db)
            if result.get("plans_created") or result.get("settings_created"):
                logger.info("Bootstrap: %s", result)
    except Exception as exc:
        logger.warning("Bootstrap skipped: %s", exc)

    # Note: Bots run client-side (user's own machine). See SDK folders:
    # sdk/AuthSys-Discord-Bot-Example/ and sdk/AuthSys-Telegram-Bot-Example/
    logger.info("Bot manager disabled — bots run client-side via AuthSys Seller API")

@app.on_event("shutdown")
async def shutdown_event():
    pass

# CORS Middleware - Allow Vercel and localhost origins
class DynamicCORSMiddleware(BaseHTTPMiddleware):
    # Hostnames treated as local development origins (matched exactly, not as
    # substrings — a substring check like `"localhost" in origin` is exploitable
    # by origins such as https://evil-localhost.attacker.com).
    _LOCAL_HOSTS = {"localhost", "127.0.0.1", "[::1]"}

    @classmethod
    def _is_local_origin(cls, origin: str) -> bool:
        try:
            parsed = urlparse(origin)
        except (ValueError, TypeError):
            return False
        host = parsed.hostname or ""
        # hostname is lowercased by urlparse; compare exactly against local hosts.
        return host in cls._LOCAL_HOSTS

    @classmethod
    def _origin_allowed(cls, origin: str, allowed_origins: list[str]) -> bool:
        if not origin:
            return False
        if origin in allowed_origins:
            return True
        # Allow common deployment hosts
        if origin.endswith(".vercel.app") or origin.endswith(".onrender.com") or origin.endswith(".railway.app") or origin.endswith(".up.railway.app"):
            return True
        return cls._is_local_origin(origin)

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")

        allowed_origins = settings.BACKEND_CORS_ORIGINS
        is_allowed = self._origin_allowed(origin, allowed_origins)

        if request.method == "OPTIONS":
            response = StarletteResponse(status_code=200)
            if is_allowed:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept"
            return response

        response = await call_next(request)

        if is_allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"

        return response

app.add_middleware(DynamicCORSMiddleware)

# Maintenance Middleware with caching
_system_mode_cache = {"mode": "live", "last_fetch": 0.0}
import time

@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    path = request.url.path
    if path == "/" or path.startswith("/api/v1/admin") or "/login" in path:
        return await call_next(request)
    
    # Cache system_mode for 30 seconds to avoid DB hit on every request
    mode = _system_mode_cache["mode"]
    if time.time() - _system_mode_cache["last_fetch"] > 30:
        from core.database import AsyncSessionLocal
        from models.domain import SystemSetting
        from sqlalchemy.future import select
        try:
            async with AsyncSessionLocal() as db:
                res = await db.execute(select(SystemSetting).where(SystemSetting.key == "system_mode"))
                setting = res.scalars().first()
                mode = setting.value if setting else "live"
                _system_mode_cache["mode"] = mode
                _system_mode_cache["last_fetch"] = time.time()
        except Exception:
            pass

    if mode == "maintenance":
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"detail": "Platform is under maintenance. Please try again later."}
        )
    elif mode == "lockdown":
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=403,
            content={"detail": "Security lockdown active. All external API traffic suspended."}
        )

    return await call_next(request)

# Include Routers
app.include_router(developer_auth.router)
app.include_router(client_api.router)
app.include_router(developer_apps.router)
app.include_router(developer_keys.router)
app.include_router(developer_users.router)
app.include_router(blacklist.router)
app.include_router(admin.router)
app.include_router(developer_analytics.router)
app.include_router(variables.router)
app.include_router(webhooks.router)
app.include_router(pricing.router)
app.include_router(ai_chat.router)
app.include_router(billing.router)
app.include_router(developer_team.router)
app.include_router(developer_bots.router)
app.include_router(discord_interactions.router)
app.include_router(chatrooms.router)
app.include_router(seller_api.router)
app.include_router(developer_responses.router)
app.include_router(developer_notifications.router)
app.include_router(developer_sessions.router)
app.include_router(developer_security.router)
app.include_router(developer_domains.router)
app.include_router(developer_backups.router)
app.include_router(developer_environments.router)
app.include_router(developer_health.router)
app.include_router(developer_organization.router)
app.include_router(developer_usage.router)
app.include_router(developer_scheduled.router)
app.include_router(admin_custom_plans.router)
app.include_router(oauth.router)

# Background scheduler loop
import asyncio
from services.scheduler import scheduler_loop

@app.on_event("startup")
async def start_scheduler():
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return
    asyncio.create_task(scheduler_loop())

@app.get("/")
@limiter.limit("5/minute")
async def root(request: Request):
    return {"message": "AuthSys API is running. Ready to authenticate."}
