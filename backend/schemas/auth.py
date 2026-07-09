from pydantic import BaseModel, EmailStr
from typing import Optional, Literal

class DeveloperCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    turnstile_token: Optional[str] = None

class PlanSummary(BaseModel):
    id: int
    name: str
    max_apps: int
    max_users_per_app: int
    max_keys_per_month: int
    features_json: Optional[list] = []
    ai_agent_access: bool = False
    audit_log_limit: int = 1000

    class Config:
        from_attributes = True

class DeveloperResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_verified: bool
    display_name: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None
    preferences: Optional[dict] = None
    avatar_url: Optional[str] = None
    two_factor_enabled: bool = False
    subscription_tier: Optional[str] = "tester"
    plan_id: Optional[int] = None
    plan: Optional[PlanSummary] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class GoogleIdToken(BaseModel):
    credential: str

class OAuthCode(BaseModel):
    code: str
    provider: str

class DeveloperGoogleLogin(BaseModel):
    email: EmailStr
    name: str
    google_id: str
    avatar_url: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    code: str
    purpose: Literal['verification', 'password_reset']

class NewPassword(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class DeveloperUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None

class PreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    accent: Optional[str] = None
    sidebar: Optional[str] = None
    notifications: Optional[dict] = None

class TwoFactorSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_code: str  # base64 PNG
    backup_codes: list[str]

class TwoFactorVerifyRequest(BaseModel):
    code: str

class TwoFactorDisableRequest(BaseModel):
    password: str

class TwoFactorLoginVerify(BaseModel):
    temp_token: str
    code: str
