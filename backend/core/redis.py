from core.config import settings

_redis_client = None

async def get_redis():
    global _redis_client
    if _redis_client is None:
        import redis.asyncio as redis
        _redis_client = redis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
    return _redis_client
