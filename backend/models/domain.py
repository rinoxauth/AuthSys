from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text, BigInteger, Float
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc)

class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="admin")
    two_factor_secret = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    last_login = Column(DateTime(timezone=True), nullable=True)

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String, default='')
    price_monthly = Column(Integer)
    price_yearly = Column(Integer)
    discount = Column(Integer, default=0)
    badge_text = Column(String, default='')
    badge_color = Column(String, default='')
    is_recommended = Column(Boolean, default=False)
    button_text = Column(String, default='Choose Plan')
    button_color = Column(String, default='var(--primary)')
    icon = Column(String, default='card_membership')
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    max_apps = Column(Integer, default=2)
    max_licenses = Column(Integer, default=50)
    max_users_per_app = Column(Integer, default=50)
    max_keys_per_month = Column(Integer, default=100)
    max_variables = Column(Integer, default=40)
    max_logs = Column(Integer, default=200)
    max_hashes = Column(Integer, default=2)
    max_staff = Column(Integer, default=0)
    max_chatrooms = Column(Integer, default=0)
    features_json = Column(JSON, nullable=True)
    ai_agent_access = Column(Boolean, default=False)
    audit_log_limit = Column(Integer, default=1000)
    has_ip_tracking = Column(Boolean, default=False)
    has_location_tracking = Column(Boolean, default=False)
    has_user_panel = Column(Boolean, default=False)
    has_staff_management = Column(Boolean, default=False)
    has_discord_integration = Column(Boolean, default=False)
    has_telegram_integration = Column(Boolean, default=False)
    has_api_access = Column(Boolean, default=False)
    has_custom_domain = Column(Boolean, default=False)
    has_live_chat = Column(Boolean, default=False)
    has_audit_logs = Column(Boolean, default=False)
    has_webhooks = Column(Boolean, default=False)
    has_white_label = Column(Boolean, default=False)
    has_priority_support = Column(Boolean, default=False)
    has_ssl = Column(Boolean, default=False)
    has_global_chat = Column(Boolean, default=False)
    has_custom_bot = Column(Boolean, default=False)
    has_behavioral_threat_intel = Column(Boolean, default=False)
    has_version_whitelist = Column(Boolean, default=False)

class DeveloperAccount(Base):
    __tablename__ = "developer_accounts"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    google_id = Column(String, unique=True, index=True, nullable=True)
    avatar_url = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    timezone = Column(String, default="UTC+00:00")
    preferences = Column(JSON, nullable=True, default={})
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String, nullable=True)
    two_factor_backup_codes = Column(JSON, nullable=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=True)
    subscription_tier = Column(String, default="tester")
    api_quota_used = Column(Integer, default=0)
    stripe_customer_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_banned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    discord_id = Column(String, unique=True, index=True, nullable=True)
    github_id = Column(String, unique=True, index=True, nullable=True)
    azure_id = Column(String, unique=True, index=True, nullable=True)

    apps = relationship("Application", back_populates="developer")
    plan = relationship("SubscriptionPlan")

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id"))
    name = Column(String)
    app_secret = Column(String, unique=True, index=True)
    owner_id = Column(String, unique=True, index=True)
    version = Column(String)
    min_version = Column(String)
    status = Column(String, default="active")
    hash_check = Column(Boolean, default=False)
    integrity_key = Column(String, nullable=True)
    webhook_url = Column(String, nullable=True)
    hwid_enabled = Column(Boolean, default=True)
    maintenance_mode = Column(Boolean, default=False)
    developer_lock = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    developer = relationship("DeveloperAccount", back_populates="apps")
    keys = relationship("LicenseKey", back_populates="app")
    users = relationship("EndUser", back_populates="app")
    webhook_endpoints = relationship("WebhookEndpoint", back_populates="app")

class LicenseKey(Base):
    __tablename__ = "license_keys"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    key_value = Column(String, unique=True, index=True)
    key_type = Column(String) # time/lifetime/uses_based
    duration_days = Column(Integer, nullable=True)
    max_uses = Column(Integer, nullable=True)
    current_uses = Column(Integer, default=0)
    note = Column(Text, nullable=True)
    seller_tag = Column(String, nullable=True)
    is_paused = Column(Boolean, default=False)
    created_by_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    app = relationship("Application", back_populates="keys")

class EndUser(Base):
    __tablename__ = "end_users"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    username = Column(String, index=True)
    password_hash = Column(String)
    email = Column(String, nullable=True)
    license_key_id = Column(Integer, ForeignKey("license_keys.id", ondelete="SET NULL"), nullable=True)
    hwid = Column(String, nullable=True)
    hwid_reset_count = Column(Integer, default=0)
    hwid_reset_allowed = Column(Integer, default=1)
    ip_address = Column(String, nullable=True)
    country_code = Column(String, nullable=True)
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_banned = Column(Boolean, default=False)
    ban_reason = Column(String, nullable=True)
    ban_expires_at = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_ip = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    variable_data = Column(JSON, nullable=True)
    is_shadow = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_uses = Column(Integer, default=0)
    
    app = relationship("Application", back_populates="users")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("end_users.id", ondelete="CASCADE"))
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    token_hash = Column(String, index=True)
    ip_address = Column(String)
    hwid = Column(String)
    user_agent = Column(String)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utc_now)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("end_users.id", ondelete="CASCADE"), nullable=True)
    action_type = Column(String)
    details = Column(JSON, nullable=True)
    ip_address = Column(String)
    country = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    hwid = Column(String, nullable=True)
    is_suspicious = Column(Boolean, default=False)
    risk_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class PricingItem(Base):
    __tablename__ = "pricing_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Integer, nullable=False)  # Price in cents
    currency = Column(String, default="USD")
    billing_cycle = Column(String, nullable=False)  # monthly, yearly, one-time
    features = Column(JSON, nullable=True)  # List of features
    is_active = Column(Boolean, default=True)
    is_popular = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

class Blacklist(Base):
    __tablename__ = "blacklist"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=True)
    type = Column(String) # ip/hwid/username/email
    value = Column(String)
    reason = Column(String, nullable=True)
    added_by = Column(Integer, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Variable(Base):
    __tablename__ = "variables"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    key_name = Column(String)
    key_value = Column(String)
    is_global = Column(Boolean, default=True)
    allowed_users = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class WebhookLog(Base):
    __tablename__ = "webhooks_log"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    endpoint_id = Column(Integer, ForeignKey("webhook_endpoints.id", ondelete="CASCADE"), nullable=True)
    event_type = Column(String)
    payload = Column(JSON)
    response_status = Column(Integer, nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

class WebhookEndpoint(Base):
    __tablename__ = "webhook_endpoints"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    url = Column(String)
    description = Column(String, default='')
    is_active = Column(Boolean, default=True)
    secret_token = Column(String, nullable=True)
    events = Column(JSON, nullable=True) # e.g. ["login", "register"]
    created_at = Column(DateTime(timezone=True), default=utc_now)
    last_sent_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String, nullable=True)

    app = relationship("Application", back_populates="webhook_endpoints")

class AIAgentLog(Base):
    __tablename__ = "ai_agent_logs"
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, nullable=True)
    developer_id = Column(Integer, nullable=True)
    command_text = Column(String)
    action_taken = Column(String)
    result = Column(JSON)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(Text)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id"))
    amount = Column(Integer) # In cents
    currency = Column(String, default="usd")
    status = Column(String) # pending, completed, failed
    stripe_session_id = Column(String, nullable=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"))
    payment_method = Column(String, nullable=True)
    wallet_number = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class SDKDownload(Base):
    __tablename__ = "sdk_downloads"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String) # C++, C#, Python, etc.
    version = Column(String)
    download_url = Column(String)
    icon_name = Column(String, default="deployed_code")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class PaymentMethod(Base):
    __tablename__ = "payment_methods"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String) # bKash, Nagad, Card, etc.
    type = Column(String) # local, international
    instructions = Column(Text, nullable=True) # "Send Money to 017..."
    exchange_rate = Column(Integer, default=120) # 1 USD = 120 BDT
    icon_name = Column(String, default="payments")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class TeamMember(Base):
    __tablename__ = "team_members"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE")) # The invited person
    role = Column(String) # admin, moderator, support
    created_at = Column(DateTime(timezone=True), default=utc_now)

    owner = relationship("DeveloperAccount", foreign_keys=[developer_id])
    member = relationship("DeveloperAccount", foreign_keys=[user_id])

class BotConfig(Base):
    __tablename__ = "bot_configs"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=True)
    bot_type = Column(String) # discord, telegram
    bot_token = Column(String)
    discord_app_id = Column(String, nullable=True)
    discord_public_key = Column(String, nullable=True)
    webhook_url = Column(String, nullable=True) # For telegram webhooks
    is_active = Column(Boolean, default=True)
    settings = Column(JSON, nullable=True) # e.g. enabled commands
    created_at = Column(DateTime(timezone=True), default=utc_now)

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    messages = relationship("ChatMessage", back_populates="room")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("end_users.id", ondelete="CASCADE"))
    message = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    room = relationship("ChatRoom", back_populates="messages")
    user = relationship("EndUser")

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    message = Column(Text)
    severity = Column(String, default="info")  # info, warning, critical
    created_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    creator = relationship("AdminUser")

class SellerAccount(Base):
    __tablename__ = "seller_accounts"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    name = Column(String)
    api_key = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class AIProviderConfig(Base):
    __tablename__ = "ai_provider_config"
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String)  # openai, gemini, claude, custom
    api_key_encrypted = Column(Text)  # API key (should be encrypted in production)
    model_name = Column(String)  # e.g., gpt-4o, gemini-pro, claude-3-opus-20240229
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # Lower number = higher priority
    settings = Column(JSON, nullable=True)  # e.g., temperature, max_tokens
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class AIConversation(Base):
    __tablename__ = "ai_conversations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    role = Column(String)  # admin, user
    messages = Column(JSON, nullable=True)
    context = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class AIActionLog(Base):
    __tablename__ = "ai_action_logs"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id", ondelete="CASCADE"))
    action_type = Column(String)
    parameters = Column(JSON, nullable=True)
    status = Column(String)  # success, failed, pending
    result = Column(JSON, nullable=True)
    executed_at = Column(DateTime(timezone=True), default=utc_now)

class AIKnowledgeBase(Base):
    __tablename__ = "ai_knowledge_base"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    category = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)
    embedding_vector = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


# ═══════════════════════════════════════════════
# Premium Features - Session Management
# ═══════════════════════════════════════════════

class DeveloperSession(Base):
    __tablename__ = "developer_sessions"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    token_hash = Column(String, index=True)
    ip_address = Column(String)
    user_agent = Column(String, nullable=True)
    device_name = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_current = Column(Boolean, default=True)
    last_activity = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=True)


# ═══════════════════════════════════════════════
# Premium Features - Security & Compliance
# ═══════════════════════════════════════════════

class IPWhitelistRule(Base):
    __tablename__ = "ip_whitelist_rules"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    rule_type = Column(String)
    value = Column(String)
    is_blocklist = Column(Boolean, default=False)
    note = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    name = Column(String)
    key_prefix = Column(String, index=True)
    key_hash = Column(String)
    scopes = Column(JSON, default=list)
    ip_restrictions = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


# ═══════════════════════════════════════════════
# Premium Features - Developer Experience
# ═══════════════════════════════════════════════

class CustomDomain(Base):
    __tablename__ = "custom_domains"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    domain = Column(String, unique=True)
    ssl_enabled = Column(Boolean, default=False)
    ssl_cert = Column(Text, nullable=True)
    ssl_key = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class AppBackup(Base):
    __tablename__ = "app_backups"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    name = Column(String)
    config_snapshot = Column(JSON)
    size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class AppEnvironment(Base):
    __tablename__ = "app_environments"
    id = Column(Integer, primary_key=True, index=True)
    parent_app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    name = Column(String)
    app_secret = Column(String)
    owner_id = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


# ═══════════════════════════════════════════════
# Premium Features - Monitoring & Analytics
# ═══════════════════════════════════════════════

class HealthCheckRecord(Base):
    __tablename__ = "health_check_records"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    endpoint = Column(String)
    status_code = Column(Integer)
    response_time_ms = Column(Integer)
    is_up = Column(Boolean)
    checked_at = Column(DateTime(timezone=True), default=utc_now)


class LogRetentionConfig(Base):
    __tablename__ = "log_retention_configs"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), unique=True)
    retention_days = Column(Integer, default=30)
    auto_cleanup = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


# ═══════════════════════════════════════════════
# Premium Features - Team & Billing
# ═══════════════════════════════════════════════

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    owner_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    slug = Column(String, unique=True)
    logo_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    members = relationship("OrganizationMember", back_populates="organization")


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"))
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    role = Column(String)
    invited_by = Column(Integer, ForeignKey("developer_accounts.id"), nullable=True)
    is_accepted = Column(Boolean, default=False)
    joined_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    organization = relationship("Organization", back_populates="members")


class UsageRecord(Base):
    __tablename__ = "usage_records"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    metric = Column(String)
    quantity = Column(Integer, default=0)
    billing_period_start = Column(DateTime(timezone=True))
    billing_period_end = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utc_now)


class CustomPlanOverride(Base):
    __tablename__ = "custom_plan_overrides"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    feature_key = Column(String)
    feature_value = Column(JSON)
    label = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


# ═══════════════════════════════════════════════
# Premium Features - Automation
# ═══════════════════════════════════════════════

class ScheduledAction(Base):
    __tablename__ = "scheduled_actions"
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    app_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=True)
    action_type = Column(String)
    target_type = Column(String)
    target_filter = Column(JSON, nullable=True)
    payload = Column(JSON, nullable=True)
    status = Column(String, default="pending")
    result_summary = Column(JSON, nullable=True)
    scheduled_at = Column(DateTime(timezone=True))
    executed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"
    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("webhook_endpoints.id", ondelete="CASCADE"))
    event_type = Column(String)
    payload = Column(JSON)
    response_status = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    attempt_number = Column(Integer, default=1)
    max_attempts = Column(Integer, default=3)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="pending")
    error_message = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    delivered_at = Column(DateTime(timezone=True), nullable=True)


class SystemBackup(Base):
    __tablename__ = "system_backups"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    size_bytes = Column(Integer, default=0)
    status = Column(String, default="completed")
    created_at = Column(DateTime(timezone=True), default=utc_now)
