"""Redis cache helpers.

Usage:
    from app.cache import cache_get, cache_set, cache_delete

    value = await cache_get("my-key")
    await cache_set("my-key", {"data": 123}, ttl=60)
    await cache_delete("my-key")
"""

import json
from typing import Any, Optional

import redis.asyncio as aioredis

from app.config import get_settings

settings = get_settings()

redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def cache_get(key: str) -> Optional[Any]:
    """Retrieve a cached value. Returns None on miss."""
    val = await redis_client.get(key)
    return json.loads(val) if val else None


async def cache_set(key: str, value: Any, ttl: int = None) -> None:
    """Store a value with a TTL (defaults to CACHE_TTL from settings)."""
    if ttl is None:
        ttl = settings.CACHE_TTL
    await redis_client.set(key, json.dumps(value, default=str), ex=ttl)


async def cache_delete(key: str) -> None:
    """Remove a single cache key."""
    await redis_client.delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    """Remove all keys matching a glob pattern (e.g. 'user:*')."""
    async for key in redis_client.scan_iter(match=pattern):
        await redis_client.delete(key)
