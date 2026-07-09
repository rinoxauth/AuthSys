import httpx
import asyncio
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.domain import WebhookLog, WebhookEndpoint
from core.database import get_db
from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc)

async def trigger_webhook(app_id: int, event_type: str, payload: Dict[str, Any], db: AsyncSession):
    res = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.app_id == app_id,
            WebhookEndpoint.is_active == True
        )
    )
    endpoints = res.scalars().all()
    
    for ep in endpoints:
        events = ep.events
        if isinstance(events, str):
            events = [e.strip() for e in events.split(",") if e.strip()]
        if events and event_type not in events:
            continue

        log = WebhookLog(
            app_id=app_id,
            endpoint_id=ep.id,
            event_type=event_type,
            payload=payload,
            delivered_at=utc_now()
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)

        # Send asynchronously
        asyncio.create_task(send_request(ep.url, payload, log.id))

async def send_request(url: str, payload: Dict[str, Any], log_id: int):
    # We need a fresh DB session for background tasks
    from core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            # Check if it's a Discord webhook and format accordingly
            final_payload = payload
            if "discord.com/api/webhooks" in url or "discordapp.com/api/webhooks" in url:
                # Get event type from log (we'll fetch it or pass it)
                from sqlalchemy.future import select
                log_res = await db.execute(select(WebhookLog).where(WebhookLog.id == log_id))
                log_entry = log_res.scalars().first()
                event_type = log_entry.event_type if log_entry else "event"
                
                # Format a nice Discord Embed
                final_payload = {
                    "embeds": [{
                        "title": f"🛡️ AuthSys Event: {event_type.replace('_', ' ').upper()}",
                        "color": 0xadc6ff, # Vault Primary Color
                        "fields": [
                            {"name": k.replace('_', ' ').capitalize(), "value": str(v), "inline": True} 
                            for k, v in payload.items() if k != "timestamp"
                        ],
                        "footer": {"text": "AuthSys Security System"},
                        "timestamp": payload.get("timestamp") or datetime.now(timezone.utc).isoformat()
                    }]
                }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=final_payload, timeout=10.0)
                
                # Update log status
                from sqlalchemy import update
                await db.execute(
                    update(WebhookLog)
                    .where(WebhookLog.id == log_id)
                    .values(response_status=response.status_code)
                )
                await db.commit()
                print(f"Webhook sent to {url}, status: {response.status_code}")
        except Exception as e:
            print(f"Webhook failed for {url}: {e}")
            from sqlalchemy import update
            await db.execute(
                update(WebhookLog)
                .where(WebhookLog.id == log_id)
                .values(response_status=500)
            )
            await db.commit()
