from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from fastapi.security import OAuth2PasswordRequestForm
from core.database import get_db
from core.security import get_password_hash, verify_password, create_access_token, ALGORITHM
from core.config import settings
from models.domain import DeveloperAccount, SubscriptionPlan, DeveloperSession, Application, EndUser, LicenseKey, Session, ActivityLog, Variable, ChatRoom, WebhookEndpoint, WebhookDelivery, WebhookLog, IPWhitelistRule, APIKey, TeamMember, Payment
from routers.developer_sessions import record_session
from jose import jwt, JWTError
import uuid
from datetime import timedelta
from core.limiter import limiter
from services.email import EmailService
from services.otp import OTPService
from schemas.auth import (
    DeveloperCreate, DeveloperResponse, Token, DeveloperGoogleLogin,
    PasswordResetRequest, OTPVerify, NewPassword, ChangePassword, DeveloperUpdate,
    PreferencesUpdate, TwoFactorSetupResponse, TwoFactorVerifyRequest,
    TwoFactorDisableRequest, TwoFactorLoginVerify
)
from core.deps import get_current_developer
from core.turnstile import verify_turnstile
from services.totp import TOTPService

router = APIRouter(prefix="/api/v1/developer/auth", tags=["Developer Auth"])

@router.post("/register", response_model=DeveloperResponse)
@limiter.limit("5/minute")
async def register_developer(request: Request, dev_in: DeveloperCreate, db: AsyncSession = Depends(get_db)):
    if not await verify_turnstile(dev_in.turnstile_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Bot protection verification failed")
        
    result = await db.execute(select(DeveloperAccount).where(
        (DeveloperAccount.username == dev_in.username) | 
        (DeveloperAccount.email == dev_in.email)
    ))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Assign default Free plan
    plan_result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == 'Free'))
    free_plan = plan_result.scalars().first()
    
    hashed_password = get_password_hash(dev_in.password)
    new_dev = DeveloperAccount(
        username=dev_in.username,
        email=dev_in.email,
        password_hash=hashed_password,
        is_verified=False,
        plan_id=free_plan.id if free_plan else None,
        subscription_tier='tester'
    )
    db.add(new_dev)
    await db.commit()
    await db.refresh(new_dev)
    
    # Send verification email
    otp = OTPService.generate_otp()
    await OTPService.store_otp(dev_in.email, otp, "verification")
    EmailService.send_verification_code(dev_in.email, otp)
    
    return new_dev

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login_developer(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    form_dict = await request.form()
    turnstile_token = form_dict.get("turnstile_token")
    if not await verify_turnstile(turnstile_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Bot protection verification failed")

    remember_me = form_dict.get("remember_me", "false") == "true"

    result = await db.execute(
        select(DeveloperAccount).where(
            (DeveloperAccount.username == form_data.username) | 
            (DeveloperAccount.email == form_data.username)
        )
    )
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )
        
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned. Please contact support.",
        )
    
    # Check 2FA
    if user.two_factor_enabled:
        temp_token = create_access_token(
            subject=user.id,
            expires_delta=timedelta(minutes=5),
            additional_claims={"scope": "2fa_pending"},
        )
        return JSONResponse(content={"requires_2fa": True, "temp_token": temp_token})

    if remember_me:
        expire_minutes = settings.ACCESS_TOKEN_REMEMBER_DAYS * 24 * 60
    else:
        expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    
    access_token_expires = timedelta(minutes=expire_minutes)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    
    # Record session
    try:
        await record_session(user.id, access_token, request.client.host if request.client else "unknown", request.headers.get("user-agent", ""), db)
    except Exception:
        pass

    # Set httpOnly cookie
    max_age = expire_minutes * 60
    secure = request.url.scheme == "https"
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

@router.post("/session")
async def restore_session(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="No session cookie")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid session")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    result = await db.execute(
        select(DeveloperAccount)
        .options(joinedload(DeveloperAccount.plan))
        .where(DeveloperAccount.id == int(user_id))
    )
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Return fresh token + user data
    fresh_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    fresh_token = create_access_token(subject=user.id, expires_delta=fresh_expires)
    
    # Refresh the httpOnly cookie
    secure = request.url.scheme == "https"
    data = DeveloperResponse.model_validate(user)
    response = JSONResponse(content={
        "access_token": fresh_token,
        "token_type": "bearer",
        "user": data.model_dump(),
    })
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=fresh_token,
        httponly=True,
        secure=secure,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path=settings.COOKIE_PATH,
    )
    return response

@router.post("/logout")
async def logout(request: Request):
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

@router.post("/google-login", response_model=Token)
@limiter.limit("10/minute")
async def google_login(request: Request, google_data: DeveloperGoogleLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DeveloperAccount).where(DeveloperAccount.email == google_data.email))
    user = result.scalars().first()
    
    if user:
        if not user.google_id:
            user.google_id = google_data.google_id
        if not user.avatar_url and google_data.avatar_url:
            user.avatar_url = google_data.avatar_url
            
        if user.is_banned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been banned. Please contact support.",
            )
            
        await db.commit()
        await db.refresh(user)
    else:
        random_password = str(uuid.uuid4())
        hashed_password = get_password_hash(random_password)
        base_username = google_data.email.split('@')[0]
        
        # Ensure unique username
        username_result = await db.execute(select(DeveloperAccount).where(DeveloperAccount.username == base_username))
        if username_result.scalars().first():
            base_username = f"{base_username}_{str(uuid.uuid4())[:6]}"
            
        # Assign default Free plan for new Google users
        plan_result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == 'Free'))
        free_plan = plan_result.scalars().first()
        
        user = DeveloperAccount(
            username=base_username,
            email=google_data.email,
            password_hash=hashed_password,
            google_id=google_data.google_id,
            avatar_url=google_data.avatar_url,
            is_verified=True,
            plan_id=free_plan.id if free_plan else None,
            subscription_tier='tester'
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    
    secure = request.url.scheme == "https"
    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path=settings.COOKIE_PATH,
    )
    return response

@router.post("/verify-email")
async def verify_email(data: OTPVerify, db: AsyncSession = Depends(get_db)):
    if await OTPService.verify_otp(data.email, data.code, "verification"):
        result = await db.execute(select(DeveloperAccount).where(DeveloperAccount.email == data.email))
        user = result.scalars().first()
        if user:
            user.is_verified = True
            await db.commit()
            return {"success": True, "message": "Email verified successfully"}
    
    raise HTTPException(status_code=400, detail="Invalid or expired verification code")

@router.post("/resend-verification")
async def resend_verification(data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DeveloperAccount).where(DeveloperAccount.email == data.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        return {"success": True, "message": "Email is already verified"}
    
    otp = OTPService.generate_otp()
    await OTPService.store_otp(data.email, otp, "verification")
    EmailService.send_verification_code(data.email, otp)
    return {"success": True, "message": "Verification code sent"}

@router.post("/forgot-password")
async def forgot_password(data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DeveloperAccount).where(DeveloperAccount.email == data.email))
    user = result.scalars().first()
    if not user:
        # Don't reveal if user exists for security, but in this case we can for simplicity
        raise HTTPException(status_code=404, detail="Email not registered")
    
    otp = OTPService.generate_otp()
    await OTPService.store_otp(data.email, otp, "password_reset")
    EmailService.send_password_reset_code(data.email, otp)
    return {"success": True, "message": "Password reset code sent"}

@router.post("/verify-otp")
async def verify_otp(data: OTPVerify):
    if await OTPService.check_otp(data.email, data.code, data.purpose):
        return {"success": True, "message": "Code verified"}
    raise HTTPException(status_code=400, detail="Invalid or expired code")

@router.post("/reset-password")
async def reset_password(data: NewPassword, db: AsyncSession = Depends(get_db)):
    # Validate new password strength
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Verify OTP and consume it
    if await OTPService.verify_otp(data.email, data.code, "password_reset"):
        result = await db.execute(select(DeveloperAccount).where(DeveloperAccount.email == data.email))
        user = result.scalars().first()
        if user:
            user.password_hash = get_password_hash(data.new_password)
            await db.commit()
            return {"success": True, "message": "Password reset successfully"}
    
    raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    
@router.get("/me", response_model=DeveloperResponse)
async def get_me(dev: DeveloperAccount = Depends(get_current_developer)):
    return dev

@router.put("/me", response_model=DeveloperResponse)
async def update_me(data: DeveloperUpdate, dev: DeveloperAccount = Depends(get_current_developer), db: AsyncSession = Depends(get_db)):
    if data.username is not None: dev.username = data.username
    if data.avatar_url is not None: dev.avatar_url = data.avatar_url
    if data.display_name is not None: dev.display_name = data.display_name
    if data.bio is not None: dev.bio = data.bio
    if data.timezone is not None: dev.timezone = data.timezone
    await db.commit()
    await db.refresh(dev)
    return dev

@router.get("/preferences")
async def get_preferences(dev: DeveloperAccount = Depends(get_current_developer)):
    return dev.preferences or {}

@router.put("/preferences", response_model=DeveloperResponse)
async def update_preferences(data: PreferencesUpdate, dev: DeveloperAccount = Depends(get_current_developer), db: AsyncSession = Depends(get_db)):
    prefs = dev.preferences or {}
    if data.theme is not None: prefs["theme"] = data.theme
    if data.accent is not None: prefs["accent"] = data.accent
    if data.sidebar is not None: prefs["sidebar"] = data.sidebar
    if data.notifications is not None: prefs["notifications"] = data.notifications
    dev.preferences = prefs
    await db.commit()
    await db.refresh(dev)
    return dev

@router.post("/change-password")
async def change_password(data: ChangePassword, dev: DeveloperAccount = Depends(get_current_developer), db: AsyncSession = Depends(get_db)):
    # Validate new password strength
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Check if new password is different from old password
    if data.old_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    
    if not verify_password(data.old_password, dev.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    dev.password_hash = get_password_hash(data.new_password)
    await db.commit()
    return {"success": True, "message": "Password updated successfully"}


# ── 2FA ────────────────────────────────────────────────────

@router.post("/2fa/setup")
async def setup_2fa(
    dev: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
):
    if dev.two_factor_enabled:
        raise HTTPException(400, "2FA is already enabled")

    secret = TOTPService.generate_secret()
    uri = TOTPService.get_provisioning_uri(secret, dev.email)
    qr = TOTPService.generate_qr_base64(uri)
    backup_codes = TOTPService.generate_backup_codes()

    dev.two_factor_secret = secret
    dev.two_factor_backup_codes = backup_codes
    await db.commit()

    return TwoFactorSetupResponse(
        secret=secret,
        provisioning_uri=uri,
        qr_code=qr,
        backup_codes=backup_codes,
    )


@router.post("/2fa/verify")
async def verify_2fa(
    data: TwoFactorVerifyRequest,
    dev: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
):
    if dev.two_factor_enabled:
        raise HTTPException(400, "2FA is already enabled")
    if not dev.two_factor_secret:
        raise HTTPException(400, "No 2FA setup in progress. Call /2fa/setup first")

    if len(data.code) != 6 or not data.code.isdigit():
        raise HTTPException(400, "Code must be exactly 6 digits")

    if not TOTPService.verify_code(dev.two_factor_secret, data.code):
        raise HTTPException(400, "Invalid code")

    dev.two_factor_enabled = True
    await db.commit()
    return {"success": True, "message": "2FA enabled successfully"}


@router.post("/2fa/disable")
async def disable_2fa(
    data: TwoFactorDisableRequest,
    dev: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
):
    if not dev.two_factor_enabled:
        raise HTTPException(400, "2FA is not enabled")
    if not verify_password(data.password, dev.password_hash):
        raise HTTPException(400, "Incorrect password")

    dev.two_factor_enabled = False
    dev.two_factor_secret = None
    dev.two_factor_backup_codes = None
    await db.commit()
    return {"success": True, "message": "2FA disabled successfully"}


@router.post("/2fa/login-verify")
async def login_verify_2fa(
    data: TwoFactorLoginVerify,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(data.temp_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("scope") != "2fa_pending":
            raise HTTPException(400, "Invalid token scope")
        user_id = int(payload.get("sub"))
    except JWTError:
        raise HTTPException(401, "Invalid or expired temp token")

    result = await db.execute(select(DeveloperAccount).where(DeveloperAccount.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    if not user.two_factor_enabled:
        raise HTTPException(400, "2FA is not enabled for this account")

    # Check backup codes first
    if user.two_factor_backup_codes:
        codes = list(user.two_factor_backup_codes)
        if data.code in codes:
            codes.remove(data.code)
            user.two_factor_backup_codes = codes
            await db.commit()
        elif not TOTPService.verify_code(user.two_factor_secret, data.code):
            raise HTTPException(400, "Invalid code")
    elif not TOTPService.verify_code(user.two_factor_secret, data.code):
        raise HTTPException(400, "Invalid code")

    expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    access_token = create_access_token(
        subject=user.id, expires_delta=timedelta(minutes=expire_minutes)
    )

    return Token(access_token=access_token, token_type="bearer")


@router.post("/delete-account")
async def delete_account(
    dev: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the developer account and all associated data."""
    from sqlalchemy import delete as sa_delete
    dev_id = dev.id

    # Delete in order: child tables first
    await db.execute(sa_delete(WebhookDelivery).where(WebhookDelivery.endpoint_id.in_(
        select(WebhookEndpoint.id).where(WebhookEndpoint.app_id.in_(
            select(Application.id).where(Application.developer_id == dev_id)
        ))
    )))
    await db.execute(sa_delete(WebhookLog).where(WebhookLog.app_id.in_(
        select(Application.id).where(Application.developer_id == dev_id)
    )))
    await db.execute(sa_delete(WebhookEndpoint).where(WebhookEndpoint.app_id.in_(
        select(Application.id).where(Application.developer_id == dev_id)
    )))
    await db.execute(sa_delete(IPWhitelistRule).where(IPWhitelistRule.app_id.in_(
        select(Application.id).where(Application.developer_id == dev_id)
    )))
    await db.execute(sa_delete(APIKey).where(APIKey.developer_id == dev_id))
    await db.execute(sa_delete(TeamMember).where(
        (TeamMember.developer_id == dev_id) | (TeamMember.user_id == dev_id)
    ))
    await db.execute(sa_delete(ChatRoom).where(ChatRoom.app_id.in_(
        select(Application.id).where(Application.developer_id == dev_id)
    )))
    await db.execute(sa_delete(Variable).where(Variable.app_id.in_(
        select(Application.id).where(Application.developer_id == dev_id)
    )))
    await db.execute(sa_delete(ActivityLog).where(ActivityLog.app_id.in_(
        select(Application.id).where(Application.developer_id == dev_id)
    )))
    await db.execute(sa_delete(Session).where(Session.app_id.in_(
        select(Application.id).where(Application.developer_id == dev_id)
    )))
    await db.execute(sa_delete(LicenseKey).where(LicenseKey.app_id.in_(
        select(Application.id).where(Application.developer_id == dev_id)
    )))
    await db.execute(sa_delete(EndUser).where(EndUser.app_id.in_(
        select(Application.id).where(Application.developer_id == dev_id)
    )))
    await db.execute(sa_delete(Application).where(Application.developer_id == dev_id))
    await db.execute(sa_delete(Payment).where(Payment.developer_id == dev_id))
    await db.execute(sa_delete(DeveloperAccount).where(DeveloperAccount.id == dev_id))
    await db.commit()
    return {"status": "success", "message": "Account permanently deleted"}
