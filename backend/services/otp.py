"""One-time-password storage backed by Redis.

This service MUST run inside an async context: it uses the shared async Redis
client from ``core.redis`` so calls never block the event loop. Earlier this
module used a *synchronous* redis client which blocked every register/login/
reset request, and silently swallowed all errors (making OTP flows fail
invisibly when Redis was unavailable). Errors are now logged and surfaced
rather than swallowed, so a broken OTP store is loud instead of silent.
"""

import logging
import secrets

from core.redis import get_redis

logger = logging.getLogger(__name__)


class OTPService:
    @staticmethod
    def generate_otp(length: int = 6) -> str:
        return ''.join(secrets.choice('0123456789') for _ in range(length))

    @staticmethod
    async def store_otp(email: str, otp: str, purpose: str, expire_seconds: int = 600) -> None:
        key = f"otp:{purpose}:{email}"
        r = await get_redis()
        try:
            await r.setex(key, expire_seconds, otp)
        except Exception:
            logger.exception("Failed to store OTP for purpose=%s email=%s", purpose, email)
            raise

    @staticmethod
    async def check_otp(email: str, otp: str, purpose: str) -> bool:
        """Check OTP without consuming it (for verify-otp step)."""
        key = f"otp:{purpose}:{email}"
        r = await get_redis()
        try:
            stored_otp = await r.get(key)
        except Exception:
            logger.exception("Failed to read OTP for purpose=%s email=%s", purpose, email)
            return False
        return bool(stored_otp and stored_otp == otp)

    @staticmethod
    async def verify_otp(email: str, otp: str, purpose: str) -> bool:
        """Check OTP and consume it (delete after use)."""
        key = f"otp:{purpose}:{email}"
        r = await get_redis()
        try:
            stored_otp = await r.get(key)
            if stored_otp and stored_otp == otp:
                await r.delete(key)
                return True
        except Exception:
            logger.exception("Failed to verify OTP for purpose=%s email=%s", purpose, email)
            return False
        return False
