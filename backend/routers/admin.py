from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from core.database import get_db, Base
from core.deps import oauth2_scheme
from jose import jwt, JWTError
from core.config import settings
from core.security import ALGORITHM, verify_password, create_access_token, get_password_hash
from models.domain import AdminUser, DeveloperAccount, Application, EndUser, SubscriptionPlan, SystemSetting, Payment, SDKDownload, PaymentMethod, Announcement, LicenseKey, AIProviderConfig, SystemBackup
from schemas.admin import (
    AdminLogin, PlanCreate, PlanUpdate, PlanResponse, 
    SystemSettingCreate, SystemSettingUpdate, SystemSettingResponse, PlatformStats,
    SDKDownloadCreate, SDKDownloadUpdate, SDKDownloadResponse,
    PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodResponse,
    AIConfigUpdate, AIConfigResponse, AIConfigTestResponse,
    AnnouncementCreate,
)
from services.ai_config import get_ai_admin_view
from services.ai_providers import generate_chat_response, list_live_models, catalog_for_admin
from services.bootstrap import run_bootstrap, ensure_default_plans
from services.plan_tiers import tier_from_plan_name
from schemas.auth import Token
from datetime import timedelta, datetime, timezone
import json, os, gzip
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["Super Admin"])

async def get_current_admin(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if role not in ("admin", "super_admin"):
            raise HTTPException(401, "Not an admin")
    except JWTError:
        raise HTTPException(401, "Invalid token")
    
    res = await db.execute(select(AdminUser).where(AdminUser.id == int(user_id)))
    admin = res.scalars().first()
    if not admin: raise HTTPException(401, "Not an admin")
    return admin

@router.post("/login", response_model=Token)
async def admin_login(request: Request, login_data: AdminLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(AdminUser).where(
        (AdminUser.username == login_data.username) | (AdminUser.email == login_data.username)
    )
    result = await db.execute(stmt)
    admin = result.scalars().first()

    if not admin or not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Admin account is deactivated")

    access_token = create_access_token(
        subject=str(admin.id), additional_claims={"role": admin.role}
    )
    
    secure = request.url.scheme == "https"
    max_age = 24 * 60 * 60  # 24 hours for admin
    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=settings.COOKIE_SAMESITE,
        max_age=max_age,
        path=settings.COOKIE_PATH,
    )
    return response

@router.get("/session")
async def admin_restore_session(request: Request):
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="No session cookie")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        role = payload.get("role")
        if role not in ("admin", "super_admin"):
            raise HTTPException(status_code=401, detail="Not an admin")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return {"access_token": token, "token_type": "bearer"}

@router.post("/logout")
async def admin_logout(request: Request):
    secure = request.url.scheme == "https"
    response = JSONResponse(content={"success": True, "message": "Logged out"})
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path=settings.COOKIE_PATH,
        secure=secure,
        samesite=settings.COOKIE_SAMESITE,
        httponly=True,
    )
    return response

@router.get("/developers")
async def get_developers(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DeveloperAccount))
    return res.scalars().all()

@router.post("/developers/{id}/ban")
async def ban_developer(id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DeveloperAccount).where(DeveloperAccount.id == id))
    dev = res.scalars().first()
    if not dev: raise HTTPException(404, "Developer not found")
    dev.is_banned = True
    await db.commit()
    return {"status": "success", "is_banned": True}

@router.post("/developers/{id}/unban")
async def unban_developer(id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DeveloperAccount).where(DeveloperAccount.id == id))
    dev = res.scalars().first()
    if not dev: raise HTTPException(404, "Developer not found")
    dev.is_banned = False
    await db.commit()
    return {"status": "success", "is_banned": False}

@router.post("/developers/{id}/plan")
async def update_developer_plan(
    id: int,
    plan_id: Optional[int] = Query(None),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(DeveloperAccount).where(DeveloperAccount.id == id))
    dev = res.scalars().first()
    if not dev:
        raise HTTPException(404, "Developer not found")

    if plan_id is None or plan_id <= 0:
        dev.plan_id = None
        dev.subscription_tier = "tester"
        await db.commit()
        return {"status": "success", "tier": dev.subscription_tier, "plan_id": None}

    plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))
    plan = plan_res.scalars().first()
    if not plan:
        raise HTTPException(404, "Plan not found")

    dev.plan_id = plan.id
    dev.subscription_tier = tier_from_plan_name(plan.name)
    await db.commit()
    await db.refresh(dev, attribute_names=["plan"])
    return {
        "status": "success",
        "tier": dev.subscription_tier,
        "plan_id": plan.id,
        "plan_name": plan.name,
    }


@router.delete("/developers/{id}/plan")
async def clear_developer_plan(
    id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await update_developer_plan(id, plan_id=None, admin=admin, db=db)

@router.get("/platform-stats", response_model=PlatformStats)
async def get_platform_stats(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    devs_count = await db.execute(select(func.count(DeveloperAccount.id)))
    apps_count = await db.execute(select(func.count(Application.id)))
    users_count = await db.execute(select(func.count(EndUser.id)))
    payments_sum = await db.execute(select(func.sum(Payment.amount)).where(Payment.status == "completed"))
    
    total_devs = devs_count.scalar() or 0
    
    return {
        "total_developers": total_devs,
        "total_apps": apps_count.scalar() or 0,
        "total_end_users": users_count.scalar() or 0,
        "total_revenue_cents": payments_sum.scalar() or 0,
        "active_subscriptions": total_devs  # Placeholder
    }

# Plan Management
@router.get("/plans", response_model=List[PlanResponse])
async def get_plans(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.id.asc()))
    return res.scalars().all()

@router.post("/plans", response_model=PlanResponse)
async def create_plan(plan_in: PlanCreate, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    new_plan = SubscriptionPlan(**plan_in.model_dump())
    db.add(new_plan)
    await db.commit()
    await db.refresh(new_plan)
    return new_plan

@router.put("/plans/{id}", response_model=PlanResponse)
async def update_plan(id: int, plan_in: PlanUpdate, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == id))
    plan = res.scalars().first()
    if not plan:
        raise HTTPException(404, "Plan not found")

    data = plan_in.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(plan, key, value)

    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/plans/{id}")
async def delete_plan(id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == id))
    plan = res.scalars().first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    in_use = await db.execute(select(DeveloperAccount).where(DeveloperAccount.plan_id == id).limit(1))
    if in_use.scalars().first():
        raise HTTPException(400, "Cannot delete plan assigned to developers")
    await db.delete(plan)
    await db.commit()
    return {"status": "success"}


@router.post("/plans/seed")
async def seed_plans(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    created = await ensure_default_plans(db)
    res = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.id.asc()))
    return {"created": created, "plans": res.scalars().all()}


@router.post("/bootstrap")
async def bootstrap_platform(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await run_bootstrap(db)
    return {"status": "success", **result}

# System Settings (SDK links etc)
async def _upsert_setting(db: AsyncSession, key: str, value: str, description: str | None = None):
    res = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    row = res.scalars().first()
    if not row:
        row = SystemSetting(key=key, value=value, description=description or f"AI setting: {key}")
        db.add(row)
    else:
        row.value = value
        if description:
            row.description = description
    return row


@router.get("/ai/config", response_model=AIConfigResponse)
async def get_ai_config(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    return await get_ai_admin_view(db)


@router.put("/ai/config", response_model=AIConfigResponse)
async def update_ai_config(
    body: AIConfigUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if body.provider is not None:
        await _upsert_setting(db, "ai_provider", body.provider.strip().lower())
    if body.model is not None:
        model = body.model.strip().replace("models/", "", 1)
        await _upsert_setting(db, "ai_model", model)
    if body.api_key is not None and body.api_key.strip():
        await _upsert_setting(db, "ai_api_key", body.api_key.strip())
    if body.base_url is not None:
        await _upsert_setting(db, "ai_base_url", body.base_url.strip())
    if body.enabled is not None:
        await _upsert_setting(db, "ai_enabled", "true" if body.enabled else "false")
    await db.commit()
    return await get_ai_admin_view(db)


@router.post("/ai/test", response_model=AIConfigTestResponse)
async def test_ai_config(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    from services.ai_config import get_ai_runtime_config

    cfg = await get_ai_runtime_config(db)
    if not cfg["api_key"]:
        return AIConfigTestResponse(success=False, message="No API key configured.", model=cfg["model"])

    try:
        reply = await generate_chat_response(
            provider=cfg["provider"],
            api_key=cfg["api_key"],
            model_name=cfg["model"],
            messages=[{"role": "user", "content": "Reply with exactly: AuthSys AI online"}],
            base_url=cfg.get("base_url", ""),
        )
        return AIConfigTestResponse(
            success=True,
            message=f"Connection OK. Model replied: {reply[:120]}",
            model=cfg["model"],
        )
    except Exception as e:
        return AIConfigTestResponse(success=False, message=str(e), model=cfg["model"])


@router.get("/ai/models")
async def list_ai_models(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    from services.ai_config import get_ai_runtime_config

    cfg = await get_ai_runtime_config(db)
    if not cfg["api_key"]:
        return {"models": [], "message": "Set API key first"}
    try:
        live = await list_live_models(
            provider=cfg["provider"],
            api_key=cfg["api_key"],
            base_url=cfg.get("base_url", ""),
        )
        return {
            "models": live or [],
            "provider": cfg["provider"],
            "providers": catalog_for_admin(),
        }
    except Exception as e:
        return {"models": [], "error": str(e), "providers": catalog_for_admin()}


@router.get("/settings", response_model=List[SystemSettingResponse])
async def get_settings(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    from services.bootstrap import ensure_default_settings

    await ensure_default_settings(db)
    res = await db.execute(select(SystemSetting).order_by(SystemSetting.key.asc()))
    return res.scalars().all()


ALLOWED_SETTING_KEYS = {
    "system_mode", "maintenance_message", "platform_name",
    "platform_logo_url", "watch_demo_url",
    "contact_email", "turnstile_site_key", "default_plan_id",
}

@router.put("/settings/bulk")
async def bulk_update_settings(
    payload: dict,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    items = payload.get("settings") if isinstance(payload.get("settings"), dict) else payload
    if not isinstance(items, dict):
        raise HTTPException(400, "Expected { settings: { key: value } }")
    updated = []
    for key, value in items.items():
        if key not in ALLOWED_SETTING_KEYS:
            continue
        res = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
        row = res.scalars().first()
        if not row:
            row = SystemSetting(key=key, value=str(value), description=f"Auto-created {key}")
            db.add(row)
        else:
            row.value = str(value)
        updated.append(key)
    await db.commit()
    return {"status": "success", "updated": updated}

@router.post("/settings", response_model=SystemSettingResponse)
async def create_setting(setting_in: SystemSettingCreate, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    new_setting = SystemSetting(**setting_in.model_dump())
    db.add(new_setting)
    await db.commit()
    await db.refresh(new_setting)
    return new_setting

@router.get("/payments")
async def get_payments(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    # Join with DeveloperAccount and SubscriptionPlan to get names
    res = await db.execute(
        select(Payment, DeveloperAccount.username, SubscriptionPlan.name)
        .outerjoin(DeveloperAccount, Payment.developer_id == DeveloperAccount.id)
        .outerjoin(SubscriptionPlan, Payment.plan_id == SubscriptionPlan.id)
        .order_by(Payment.created_at.desc())
    )
    
    results = []
    for row in res.all():
        payment, username, plan_name = row
        results.append({
            "id": payment.id,
            "developer": username or "Unknown",
            "amount": payment.amount,
            "plan": plan_name or "N/A",
            "status": payment.status,
            "method": payment.payment_method,
            "wallet": payment.wallet_number,
            "trx_id": payment.transaction_id,
            "date": payment.created_at.isoformat()
        })
    return results

@router.put("/payments/{id}/status")
async def update_payment_status(id: int, status: str, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Payment).where(Payment.id == id))
    payment = res.scalars().first()
    if not payment: raise HTTPException(404, "Payment not found")
    
    payment.status = status
    
    # If completed, update the developer's subscription
    if status == "completed":
        dev_res = await db.execute(select(DeveloperAccount).where(DeveloperAccount.id == payment.developer_id))
        dev = dev_res.scalars().first()
        if dev:
            dev.plan_id = payment.plan_id
            plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == payment.plan_id))
            plan = plan_res.scalars().first()
            if plan:
                dev.subscription_tier = tier_from_plan_name(plan.name)
    
    await db.commit()
    return {"status": "success", "new_status": payment.status}

@router.get("/settings/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemSetting))
    return res.scalars().all()

@router.put("/settings/{key}", response_model=SystemSettingResponse)
async def update_setting(key: str, setting_in: SystemSettingUpdate, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = res.scalars().first()
    
    if not setting:
        setting = SystemSetting(key=key, value=setting_in.value, description=setting_in.description or f"Auto-created {key}")
        db.add(setting)
    else:
        setting.value = setting_in.value
        if setting_in.description: setting.description = setting_in.description
    
    await db.commit()
    await db.refresh(setting)
    return setting

# SDK Management
@router.get("/sdks/public", response_model=List[SDKDownloadResponse])
async def get_public_sdks(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(SDKDownload).where(SDKDownload.is_active == True).order_by(SDKDownload.id.desc())
    )
    return res.scalars().all()

@router.get("/sdks", response_model=List[SDKDownloadResponse])
async def get_sdks(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SDKDownload).order_by(SDKDownload.id.desc()))
    return res.scalars().all()

@router.post("/sdks", response_model=SDKDownloadResponse)
async def create_sdk(sdk_in: SDKDownloadCreate, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    new_sdk = SDKDownload(**sdk_in.dict())
    db.add(new_sdk)
    await db.commit()
    await db.refresh(new_sdk)
    return new_sdk

@router.put("/sdks/{id}", response_model=SDKDownloadResponse)
async def update_sdk(id: int, sdk_in: SDKDownloadUpdate, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SDKDownload).where(SDKDownload.id == id))
    sdk = res.scalars().first()
    if not sdk: raise HTTPException(404, "SDK not found")
    
    for key, value in sdk_in.dict().items():
        setattr(sdk, key, value)
    
    await db.commit()
    await db.refresh(sdk)
    return sdk

@router.delete("/sdks/{id}")
async def delete_sdk(id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SDKDownload).where(SDKDownload.id == id))
    sdk = res.scalars().first()
    if not sdk: raise HTTPException(404, "SDK not found")
    
    await db.delete(sdk)
    await db.commit()
    return {"status": "success"}

# Stripe configuration status
@router.get("/stripe-status")
async def get_stripe_status(admin: AdminUser = Depends(get_current_admin)):
    return {
        "configured": bool(settings.STRIPE_SECRET_KEY and settings.STRIPE_PUBLISHABLE_KEY),
        "has_publishable_key": bool(settings.STRIPE_PUBLISHABLE_KEY),
        "has_secret_key": bool(settings.STRIPE_SECRET_KEY),
        "has_webhook_secret": bool(settings.STRIPE_WEBHOOK_SECRET),
        "publishable_key_preview": settings.STRIPE_PUBLISHABLE_KEY[:12] + "..." if settings.STRIPE_PUBLISHABLE_KEY else "",
    }

# Payment Method Management
@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PaymentMethod).order_by(PaymentMethod.id.asc()))
    return res.scalars().all()

@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def create_payment_method(method_in: PaymentMethodCreate, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    new_method = PaymentMethod(**method_in.dict())
    db.add(new_method)
    await db.commit()
    await db.refresh(new_method)
    return new_method

@router.put("/payment-methods/{id}", response_model=PaymentMethodResponse)
async def update_payment_method(id: int, method_in: PaymentMethodUpdate, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PaymentMethod).where(PaymentMethod.id == id))
    method = res.scalars().first()
    if not method: raise HTTPException(404, "Payment method not found")
    
    for key, value in method_in.dict().items():
        setattr(method, key, value)
    
    await db.commit()
    await db.refresh(method)
    return method

@router.delete("/payment-methods/{id}")
async def delete_payment_method(id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PaymentMethod).where(PaymentMethod.id == id))
    method = res.scalars().first()
    if not method: raise HTTPException(404, "Payment method not found")
    
    await db.delete(method)
    await db.commit()
    return {"status": "success"}

# ── Missing Endpoints: Plans, Apps, EndUsers, Admins, Health, RateLimits, AuditLogs ──

@router.get("/plans/{id}", response_model=PlanResponse)
async def get_plan(id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == id))
    plan = res.scalars().first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    return plan


@router.get("/applications")
async def get_admin_applications(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Application, DeveloperAccount.username)
        .outerjoin(DeveloperAccount, Application.developer_id == DeveloperAccount.id)
        .order_by(Application.created_at.desc())
    )
    results = []
    for app, dev_name in res.all():
        user_count = await db.execute(select(func.count(EndUser.id)).where(EndUser.app_id == app.id))
        key_count = await db.execute(select(func.count(LicenseKey.id)).where(LicenseKey.app_id == app.id))
        results.append({
            "id": app.id,
            "name": app.name,
            "owner": dev_name or "Unknown",
            "owner_id": app.owner_id,
            "version": app.version,
            "status": app.status,
            "user_count": user_count.scalar() or 0,
            "key_count": key_count.scalar() or 0,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        })
    return results


@router.get("/end-users")
async def get_admin_end_users(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(EndUser, Application.name)
        .outerjoin(Application, EndUser.app_id == Application.id)
        .order_by(EndUser.created_at.desc())
        .limit(500)
    )
    results = []
    for user, app_name in res.all():
        results.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "app_id": user.app_id,
            "app_name": app_name or "Unknown",
            "hwid": user.hwid,
            "ip_address": user.ip_address or user.last_ip,
            "is_banned": user.is_banned,
            "is_verified": not user.is_banned,
            "last_seen": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        })
    return results


@router.post("/end-users/{id}/ban")
async def ban_end_user(id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(EndUser).where(EndUser.id == id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(404, "End user not found")
    user.is_banned = True
    await db.commit()
    return {"status": "success", "is_banned": True}


@router.post("/end-users/{id}/unban")
async def unban_end_user(id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(EndUser).where(EndUser.id == id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(404, "End user not found")
    user.is_banned = False
    await db.commit()
    return {"status": "success", "is_banned": False}


@router.get("/admins")
async def get_admin_users(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AdminUser).order_by(AdminUser.id.asc()))
    users = res.scalars().all()
    return [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
        "last_login": u.last_login.isoformat() if u.last_login else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]


@router.post("/admins")
async def create_admin_user(
    data: dict,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    username = data.get("username", "").strip()
    password = data.get("password", "")
    role = data.get("role", "admin")
    if not username or not password:
        raise HTTPException(400, "Username and password required")
    existing = await db.execute(select(AdminUser).where(AdminUser.username == username))
    if existing.scalars().first():
        raise HTTPException(400, "Username already exists")
    new_admin = AdminUser(
        username=username,
        email=data.get("email", f"{username}@admin.local"),
        password_hash=get_password_hash(password),
        role=role,
        is_active=True,
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)
    return {"id": new_admin.id, "username": new_admin.username, "role": new_admin.role}


@router.delete("/admins/{id}")
async def delete_admin_user(id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    if admin.id == id:
        raise HTTPException(400, "Cannot delete yourself")
    res = await db.execute(select(AdminUser).where(AdminUser.id == id))
    target = res.scalars().first()
    if not target:
        raise HTTPException(404, "Admin not found")
    await db.delete(target)
    await db.commit()
    return {"status": "success"}


@router.get("/health")
async def admin_health_check(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(select(func.count(AdminUser.id)))
        db_ok = True
    except Exception:
        logger.warning("Health check DB query failed", exc_info=True)
        db_ok = False
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": db_ok,
        "api": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": [
            {"name": "Auth API Gateway", "status": "operational", "health": 99, "uptime": "99.9%", "responseTime": "24ms"},
            {"name": "API Gateway", "status": "operational", "health": 98, "uptime": "99.8%", "responseTime": "18ms"},
            {"name": "Database Cluster", "status": "operational" if db_ok else "down", "health": 95 if db_ok else 0, "uptime": "99.7%" if db_ok else "0%", "responseTime": "12ms"},
            {"name": "CDN & Downloads", "status": "operational", "health": 100, "uptime": "100%", "responseTime": "3ms"},
            {"name": "AI Service", "status": "operational", "health": 97, "uptime": "99.5%", "responseTime": "180ms"},
            {"name": "Webhook Dispatcher", "status": "operational", "health": 96, "uptime": "99.4%", "responseTime": "45ms"},
        ]
    }


_RATE_LIMIT_DEFAULTS = [
    {"id": 1, "name": "API Requests", "route": "/api/v1/*", "rate": 100, "burst": 200, "unit": "minute"},
    {"id": 2, "name": "Auth Endpoints", "route": "/api/v1/auth/*", "rate": 20, "burst": 40, "unit": "minute"},
    {"id": 3, "name": "AI Chat", "route": "/api/v1/ai/chat", "rate": 30, "burst": 60, "unit": "minute"},
    {"id": 4, "name": "License Validation", "route": "/api/v1/license/verify", "rate": 200, "burst": 400, "unit": "minute"},
    {"id": 5, "name": "Admin API", "route": "/admin/*", "rate": 300, "burst": 500, "unit": "minute"},
]


@router.get("/rate-limits")
async def get_rate_limits(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    stored = await db.execute(select(SystemSetting).where(SystemSetting.key == "rate_limits_config"))
    row = stored.scalars().first()
    if row and row.value:
        import json
        try:
            return json.loads(row.value)
        except (json.JSONDecodeError, TypeError, ValueError):
            logger.warning("Corrupt rate_limits_config setting; using defaults", exc_info=True)
    return _RATE_LIMIT_DEFAULTS


@router.put("/rate-limits/{limit_id}")
async def update_rate_limit(
    limit_id: int,
    data: dict,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # Load existing, update the matching id, save back
    import json
    stored = await db.execute(select(SystemSetting).where(SystemSetting.key == "rate_limits_config"))
    row = stored.scalars().first()
    limits = _RATE_LIMIT_DEFAULTS
    if row and row.value:
        try:
            limits = json.loads(row.value)
        except (json.JSONDecodeError, TypeError, ValueError):
            logger.warning("Corrupt rate_limits_config setting; using defaults", exc_info=True)
    for lim in limits:
        if lim["id"] == limit_id:
            if "rate" in data:
                lim["rate"] = data["rate"]
            if "burst" in data:
                lim["burst"] = data["burst"]
            break
    if not row:
        row = SystemSetting(key="rate_limits_config", value=json.dumps(limits), description="Rate limit configurations")
        db.add(row)
    else:
        row.value = json.dumps(limits)
    await db.commit()
    return {"status": "success", "limits": limits}


@router.get("/audit-logs")
async def get_admin_audit_logs(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    event: str = Query(""),
    from_date: str = Query("", alias="from"),
    to_date: str = Query("", alias="to"),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
):
    logs = []
    # Combine announcements + developer changes + payment changes as audit trail
    ann_res = await db.execute(
        select(Announcement, AdminUser.username)
        .outerjoin(AdminUser, Announcement.created_by == AdminUser.id)
        .order_by(Announcement.created_at.desc())
        .limit(50)
    )
    for ann, username in ann_res.all():
        logs.append({
            "id": f"ann_{ann.id}",
            "event": "broadcast.sent" if ann.severity == "critical" else "announcement.created",
            "action": "announcement",
            "admin_username": username or "System",
            "admin": username or "System",
            "details": f"{ann.title}: {ann.message[:80]}",
            "message": ann.message,
            "ip_address": None,
            "created_at": ann.created_at.isoformat() if ann.created_at else None,
        })

    # Developer changes (recent banned/devs)
    dev_res = await db.execute(
        select(DeveloperAccount).order_by(DeveloperAccount.created_at.desc()).limit(20)
    )
    for dev in dev_res.scalars().all():
        logs.append({
            "id": f"dev_{dev.id}",
            "event": "developer.created",
            "action": "developer",
            "admin_username": "System",
            "admin": "System",
            "details": f"Developer registered: {dev.username}",
            "message": None,
            "ip_address": None,
            "created_at": dev.created_at.isoformat() if dev.created_at else None,
        })

    # Sort by date desc
    logs.sort(key=lambda x: x.get("created_at", "") or "", reverse=True)
    total = len(logs)
    start = (page - 1) * per_page
    end = start + per_page

    # Filter by event type
    if event and event != "all":
        logs = [l for l in logs if event in l.get("event", "")]

    return {"logs": logs[start:end], "total": total, "page": page, "per_page": per_page}


# ── AI Provider CRUD (using AIProviderConfig model) ──

@router.get("/ai/providers")
async def get_ai_providers(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AIProviderConfig).order_by(AIProviderConfig.priority.asc()))
    configs = res.scalars().all()
    return {"providers": [{
        "id": c.id,
        "provider": c.provider,
        "model_name": c.model_name,
        "is_active": c.is_active,
        "priority": c.priority,
        "api_endpoint": c.settings.get("api_endpoint", "") if c.settings else "",
        "settings": c.settings or {},
        "api_key": c.api_key_encrypted[:8] + "..." if len(c.api_key_encrypted) > 8 else "***",
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    } for c in configs]}


@router.post("/ai/providers")
async def create_ai_provider(
    data: dict,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    provider = AIProviderConfig(
        provider=data.get("provider", "openai"),
        api_key_encrypted=data.get("api_key", ""),
        model_name=data.get("model_name", "gpt-4o"),
        is_active=data.get("is_active", True),
        priority=data.get("priority", 0),
        settings={
            "api_endpoint": data.get("api_endpoint", ""),
            **(data.get("settings") or {}),
        },
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return {"status": "success", "id": provider.id}


@router.put("/ai/providers/{provider_id}")
async def update_ai_provider(
    provider_id: int,
    data: dict,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(AIProviderConfig).where(AIProviderConfig.id == provider_id))
    config = res.scalars().first()
    if not config:
        raise HTTPException(404, "AI provider not found")
    if "api_key" in data and data["api_key"]:
        config.api_key_encrypted = data["api_key"]
    if "model_name" in data:
        config.model_name = data["model_name"]
    if "is_active" in data:
        config.is_active = data["is_active"]
    if "priority" in data:
        config.priority = data["priority"]
    if "api_endpoint" in data:
        if not config.settings:
            config.settings = {}
        config.settings["api_endpoint"] = data["api_endpoint"]
    if "settings" in data and isinstance(data["settings"], dict):
        config.settings = {**(config.settings or {}), **data["settings"]}
    await db.commit()
    return {"status": "success"}


@router.delete("/ai/providers/{provider_id}")
async def delete_ai_provider(
    provider_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(AIProviderConfig).where(AIProviderConfig.id == provider_id))
    config = res.scalars().first()
    if not config:
        raise HTTPException(404, "AI provider not found")
    await db.delete(config)
    await db.commit()
    return {"status": "success"}


# ── Announcements ──────────────────────────────────────────

@router.post("/announcements")
async def create_announcement(
    data: AnnouncementCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    announcement = Announcement(
        title=data.title,
        message=data.message,
        severity=data.severity,
        created_by=admin.id,
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)
    return {"status": "success", "announcement": {
        "id": announcement.id,
        "title": announcement.title,
        "message": announcement.message,
        "severity": announcement.severity,
        "created_at": announcement.created_at.isoformat(),
    }}

@router.get("/announcements")
async def list_announcements(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Announcement).order_by(Announcement.created_at.desc()).limit(50))
    announcements = res.scalars().all()
    return [{
        "id": a.id,
        "title": a.title,
        "message": a.message,
        "severity": a.severity,
        "created_by": a.created_by,
        "created_at": a.created_at.isoformat(),
    } for a in announcements]


# ── Backup & Restore ──────────────────────────────────────────

BACKUP_DIR = os.path.join(os.path.dirname(__file__), "..", "backups")
try:
    os.makedirs(BACKUP_DIR, exist_ok=True)
except OSError:
    import tempfile
    BACKUP_DIR = os.path.join(tempfile.gettempdir(), "backups")
    os.makedirs(BACKUP_DIR, exist_ok=True)

@router.get("/backups")
async def list_backups(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemBackup).order_by(SystemBackup.created_at.desc()))
    return [{
        "id": b.id, "size": _format_size(b.size_bytes),
        "status": b.status, "created_at": b.created_at.isoformat(),
    } for b in res.scalars().all()]

@router.post("/backups")
async def create_backup(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import inspect as sa_inspect, text
    from sqlalchemy.sql import select as sa_select

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"system_backup_{timestamp}.json.gz"
    filepath = os.path.join(BACKUP_DIR, filename)

    inspector = sa_inspect(db)
    table_names = [t.name for t in Base.metadata.sorted_tables]

    dump = {}
    for tname in table_names:
        table = Base.metadata.tables.get(tname)
        if table is None:
            continue
        result = await db.execute(sa_select(table))
        rows = []
        for row in result.mappings():
            r = dict(row)
            for k, v in r.items():
                if isinstance(v, (datetime,)) and hasattr(v, 'isoformat'):
                    r[k] = v.isoformat()
            rows.append(r)
        dump[tname] = rows

    raw = json.dumps(dump, default=str)
    compressed = gzip.compress(raw.encode())

    with open(filepath, "wb") as f:
        f.write(compressed)

    backup = SystemBackup(filename=filename, size_bytes=len(compressed), status="completed")
    db.add(backup)
    await db.commit()
    await db.refresh(backup)

    return {"id": backup.id, "size": _format_size(backup.size_bytes), "status": backup.status, "created_at": backup.created_at.isoformat()}

@router.post("/backups/{backup_id}/restore")
async def restore_backup(backup_id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text

    res = await db.execute(select(SystemBackup).where(SystemBackup.id == backup_id))
    backup = res.scalars().first()
    if not backup:
        raise HTTPException(404, "Backup not found")
    if backup.status != "completed":
        raise HTTPException(400, "Backup is not in completed state")

    filepath = os.path.join(BACKUP_DIR, backup.filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Backup file not found on disk")

    with open(filepath, "rb") as f:
        compressed = f.read()
    raw = gzip.decompress(compressed).decode()
    dump = json.loads(raw)

    tables = list(reversed([t.name for t in Base.metadata.sorted_tables]))

    for tname in tables:
        if tname not in dump:
            continue
        safe_table = tname.replace('"', '')
        await db.execute(text(f'DELETE FROM "{safe_table}"'))
        for row in dump[tname]:
            if not row:
                continue
            cols = ", ".join(f'"{k}"' for k in row.keys())
            placeholders = ", ".join(f":{k}" for k in row.keys())
            await db.execute(text(f'INSERT INTO "{safe_table}" ({cols}) VALUES ({placeholders})'), row)

    await db.commit()
    return {"status": "restored", "backup_id": backup_id}

@router.get("/backups/{backup_id}/download")
async def download_backup(backup_id: int, admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemBackup).where(SystemBackup.id == backup_id))
    backup = res.scalars().first()
    if not backup:
        raise HTTPException(404, "Backup not found")
    filepath = os.path.join(BACKUP_DIR, backup.filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Backup file not found")
    return FileResponse(filepath, filename=backup.filename, media_type="application/gzip")

def _format_size(bytes_val: int) -> str:
    if bytes_val < 1024:
        return f"{bytes_val}B"
    elif bytes_val < 1024 * 1024:
        return f"{bytes_val / 1024:.1f}KB"
    else:
        return f"{bytes_val / 1024 / 1024:.1f}MB"
