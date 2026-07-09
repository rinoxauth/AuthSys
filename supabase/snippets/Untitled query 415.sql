-- ════════════════════════════════════════════════════════════════════
-- AuthSys — Complete Database Schema (PostgreSQL / Supabase)
-- ════════════════════════════════════════════════════════════════════
-- This file creates the ENTIRE AuthSys database schema in one shot.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).
--
-- HOW TO USE (local Supabase):
--   1. Open http://127.0.0.1:54323  (Supabase Studio)
--   2. SQL Editor → New query
--   3. Paste this ENTIRE file → Run (Ctrl+Enter)
--
-- Or via CLI:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase.sql
-- ════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════
-- PART 1: BASE TABLES (no foreign keys)
-- ════════════════════════════════════════════════════════════════════

-- ── admin_users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE,
    email VARCHAR UNIQUE,
    password_hash VARCHAR,
    role VARCHAR DEFAULT 'admin',
    two_factor_secret VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    supabase_user_id UUID UNIQUE
);
CREATE INDEX IF NOT EXISTS ix_admin_users_username ON admin_users (username);
CREATE INDEX IF NOT EXISTS ix_admin_users_email ON admin_users (email);

-- ── subscription_plans ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE,
    description VARCHAR DEFAULT '',
    price_monthly INTEGER,
    price_yearly INTEGER,
    discount INTEGER DEFAULT 0,
    badge_text VARCHAR DEFAULT '',
    badge_color VARCHAR DEFAULT '',
    is_recommended BOOLEAN DEFAULT FALSE,
    button_text VARCHAR DEFAULT 'Choose Plan',
    button_color VARCHAR DEFAULT 'var(--primary)',
    icon VARCHAR DEFAULT 'card_membership',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    max_apps INTEGER DEFAULT 2,
    max_licenses INTEGER DEFAULT 50,
    max_users_per_app INTEGER DEFAULT 50,
    max_keys_per_month INTEGER DEFAULT 100,
    max_variables INTEGER DEFAULT 40,
    max_logs INTEGER DEFAULT 200,
    max_hashes INTEGER DEFAULT 2,
    max_staff INTEGER DEFAULT 0,
    max_chatrooms INTEGER DEFAULT 0,
    features_json JSONB,
    ai_agent_access BOOLEAN DEFAULT FALSE,
    audit_log_limit INTEGER DEFAULT 1000,
    has_ip_tracking BOOLEAN DEFAULT FALSE,
    has_location_tracking BOOLEAN DEFAULT FALSE,
    has_user_panel BOOLEAN DEFAULT FALSE,
    has_staff_management BOOLEAN DEFAULT FALSE,
    has_discord_integration BOOLEAN DEFAULT FALSE,
    has_telegram_integration BOOLEAN DEFAULT FALSE,
    has_api_access BOOLEAN DEFAULT FALSE,
    has_custom_domain BOOLEAN DEFAULT FALSE,
    has_live_chat BOOLEAN DEFAULT FALSE,
    has_audit_logs BOOLEAN DEFAULT FALSE,
    has_webhooks BOOLEAN DEFAULT FALSE,
    has_white_label BOOLEAN DEFAULT FALSE,
    has_priority_support BOOLEAN DEFAULT FALSE,
    has_ssl BOOLEAN DEFAULT FALSE,
    has_global_chat BOOLEAN DEFAULT FALSE,
    has_custom_bot BOOLEAN DEFAULT FALSE,
    has_behavioral_threat_intel BOOLEAN DEFAULT FALSE,
    has_version_whitelist BOOLEAN DEFAULT FALSE
);

-- ── ai_provider_config ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_provider_config (
    id SERIAL PRIMARY KEY,
    provider VARCHAR,
    api_key_encrypted TEXT,
    model_name VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ai_knowledge_base ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR,
    content TEXT,
    category VARCHAR,
    tags JSONB,
    embedding_vector VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ai_agent_logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_agent_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    developer_id INTEGER,
    command_text VARCHAR,
    action_taken VARCHAR,
    result JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ── system_settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR UNIQUE,
    value TEXT,
    description VARCHAR,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_system_settings_key ON system_settings (key);

-- ── system_backups ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_backups (
    id SERIAL PRIMARY KEY,
    filename VARCHAR,
    size_bytes INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── pricing_items ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    currency VARCHAR DEFAULT 'USD',
    billing_cycle VARCHAR NOT NULL,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ── sdk_downloads ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sdk_downloads (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    version VARCHAR,
    download_url VARCHAR,
    icon_name VARCHAR DEFAULT 'deployed_code',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── payment_methods ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    type VARCHAR,
    instructions TEXT,
    exchange_rate INTEGER DEFAULT 120,
    icon_name VARCHAR DEFAULT 'payments',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════
-- PART 2: DEVELOPER + APPLICATION TABLES (FK → base tables)
-- ════════════════════════════════════════════════════════════════════

-- ── developer_accounts (FK → subscription_plans) ────────────────────
CREATE TABLE IF NOT EXISTS developer_accounts (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE,
    email VARCHAR UNIQUE,
    password_hash VARCHAR,
    google_id VARCHAR UNIQUE,
    avatar_url VARCHAR,
    display_name VARCHAR,
    bio VARCHAR,
    timezone VARCHAR DEFAULT 'UTC+00:00',
    preferences JSONB DEFAULT '{}'::jsonb,
    last_read_at TIMESTAMPTZ,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR,
    two_factor_backup_codes JSONB,
    plan_id INTEGER REFERENCES subscription_plans (id),
    subscription_tier VARCHAR DEFAULT 'tester',
    api_quota_used INTEGER DEFAULT 0,
    stripe_customer_id VARCHAR,
    is_verified BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    supabase_user_id UUID UNIQUE
);
CREATE INDEX IF NOT EXISTS ix_developer_accounts_username ON developer_accounts (username);
CREATE INDEX IF NOT EXISTS ix_developer_accounts_email ON developer_accounts (email);
CREATE INDEX IF NOT EXISTS ix_developer_accounts_google_id ON developer_accounts (google_id);
CREATE INDEX IF NOT EXISTS ix_developer_accounts_supabase_user_id ON developer_accounts (supabase_user_id);

-- ── applications (FK → developer_accounts) ──────────────────────────
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id),
    name VARCHAR,
    app_secret VARCHAR UNIQUE,
    owner_id VARCHAR UNIQUE,
    version VARCHAR,
    min_version VARCHAR,
    status VARCHAR DEFAULT 'active',
    hash_check BOOLEAN DEFAULT FALSE,
    integrity_key VARCHAR,
    webhook_url VARCHAR,
    hwid_enabled BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    developer_lock BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_applications_app_secret ON applications (app_secret);
CREATE INDEX IF NOT EXISTS ix_applications_owner_id ON applications (owner_id);

-- ── license_keys (FK → applications) ────────────────────────────────
CREATE TABLE IF NOT EXISTS license_keys (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    key_value VARCHAR UNIQUE,
    key_type VARCHAR,
    duration_days INTEGER,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    note TEXT,
    seller_tag VARCHAR,
    is_paused BOOLEAN DEFAULT FALSE,
    created_by_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_license_keys_key_value ON license_keys (key_value);

-- ── end_users (FK → applications, license_keys) ─────────────────────
CREATE TABLE IF NOT EXISTS end_users (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    username VARCHAR,
    password_hash VARCHAR,
    email VARCHAR,
    license_key_id INTEGER REFERENCES license_keys (id) ON DELETE SET NULL,
    hwid VARCHAR,
    hwid_reset_count INTEGER DEFAULT 0,
    hwid_reset_allowed INTEGER DEFAULT 1,
    ip_address VARCHAR,
    country_code VARCHAR,
    subscription_expires_at TIMESTAMPTZ,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason VARCHAR,
    ban_expires_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    last_ip VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    variable_data JSONB,
    is_shadow BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_end_users_username ON end_users (username);

-- ── sessions (FK → end_users, applications) ─────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES end_users (id) ON DELETE CASCADE,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    token_hash VARCHAR,
    ip_address VARCHAR,
    hwid VARCHAR,
    user_agent VARCHAR,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_sessions_token_hash ON sessions (token_hash);

-- ── activity_logs (FK → applications, end_users) ────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES end_users (id) ON DELETE CASCADE,
    action_type VARCHAR,
    details JSONB,
    ip_address VARCHAR,
    country VARCHAR,
    user_agent VARCHAR,
    hwid VARCHAR,
    is_suspicious BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── blacklist (FK → applications) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS blacklist (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    type VARCHAR,
    value VARCHAR,
    reason VARCHAR,
    added_by INTEGER,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── variables (FK → applications) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS variables (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    key_name VARCHAR,
    key_value VARCHAR,
    is_global BOOLEAN DEFAULT TRUE,
    allowed_users JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── payments (FK → developer_accounts, subscription_plans) ──────────
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id),
    amount INTEGER,
    currency VARCHAR DEFAULT 'usd',
    status VARCHAR,
    stripe_session_id VARCHAR,
    plan_id INTEGER REFERENCES subscription_plans (id),
    payment_method VARCHAR,
    wallet_number VARCHAR,
    transaction_id VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════
-- PART 3: WEBHOOKS
-- ════════════════════════════════════════════════════════════════════

-- ── webhook_endpoints (FK → applications) ───────────────────────────
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    url VARCHAR,
    description VARCHAR DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    secret_token VARCHAR,
    events JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_sent_at TIMESTAMPTZ,
    last_status VARCHAR
);

-- ── webhooks_log (FK → applications, webhook_endpoints) ─────────────
CREATE TABLE IF NOT EXISTS webhooks_log (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    endpoint_id INTEGER REFERENCES webhook_endpoints (id) ON DELETE CASCADE,
    event_type VARCHAR,
    payload JSONB,
    response_status INTEGER,
    delivered_at TIMESTAMPTZ
);

-- ── webhook_deliveries (FK → webhook_endpoints) ─────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id SERIAL PRIMARY KEY,
    endpoint_id INTEGER REFERENCES webhook_endpoints (id) ON DELETE CASCADE,
    event_type VARCHAR,
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    attempt_number INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    status VARCHAR DEFAULT 'pending',
    error_message VARCHAR,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);


-- ════════════════════════════════════════════════════════════════════
-- PART 4: TEAM / BOTS / CHAT
-- ════════════════════════════════════════════════════════════════════

-- ── team_members (FK → developer_accounts x2) ───────────────────────
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    role VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── bot_configs (FK → developer_accounts, applications) ─────────────
CREATE TABLE IF NOT EXISTS bot_configs (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    bot_type VARCHAR,
    bot_token VARCHAR,
    discord_app_id VARCHAR,
    discord_public_key VARCHAR,
    webhook_url VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── chat_rooms (FK → applications) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    name VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── chat_messages (FK → chat_rooms, end_users) ──────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES chat_rooms (id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES end_users (id) ON DELETE CASCADE,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── announcements (FK → admin_users) ────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR,
    message TEXT,
    severity VARCHAR DEFAULT 'info',
    created_by INTEGER REFERENCES admin_users (id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── seller_accounts (FK → developer_accounts) ───────────────────────
CREATE TABLE IF NOT EXISTS seller_accounts (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    name VARCHAR,
    api_key VARCHAR UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_seller_accounts_api_key ON seller_accounts (api_key);


-- ════════════════════════════════════════════════════════════════════
-- PART 5: AI TABLES
-- ════════════════════════════════════════════════════════════════════

-- ── ai_conversations (FK → developer_accounts) ──────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    role VARCHAR,
    messages JSONB,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ai_action_logs (FK → ai_conversations) ──────────────────────────
CREATE TABLE IF NOT EXISTS ai_action_logs (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES ai_conversations (id) ON DELETE CASCADE,
    action_type VARCHAR,
    parameters JSONB,
    status VARCHAR,
    result JSONB,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════
-- PART 6: SESSIONS / SECURITY
-- ════════════════════════════════════════════════════════════════════

-- ── developer_sessions (FK → developer_accounts) ────────────────────
CREATE TABLE IF NOT EXISTS developer_sessions (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    token_hash VARCHAR,
    ip_address VARCHAR,
    user_agent VARCHAR,
    device_name VARCHAR,
    location VARCHAR,
    is_current BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_developer_sessions_token_hash ON developer_sessions (token_hash);

-- ── ip_whitelist_rules (FK → applications) ──────────────────────────
CREATE TABLE IF NOT EXISTS ip_whitelist_rules (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    rule_type VARCHAR,
    value VARCHAR,
    is_blocklist BOOLEAN DEFAULT FALSE,
    note VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── api_keys (FK → developer_accounts) ──────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    name VARCHAR,
    key_prefix VARCHAR,
    key_hash VARCHAR,
    scopes JSONB DEFAULT '[]'::jsonb,
    ip_restrictions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_api_keys_key_prefix ON api_keys (key_prefix);

-- ── custom_domains (FK → developer_accounts) ────────────────────────
CREATE TABLE IF NOT EXISTS custom_domains (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    domain VARCHAR UNIQUE,
    ssl_enabled BOOLEAN DEFAULT FALSE,
    ssl_cert TEXT,
    ssl_key TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════
-- PART 7: APP ENV / BACKUPS / MONITORING
-- ════════════════════════════════════════════════════════════════════

-- ── app_backups (FK → applications) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS app_backups (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    name VARCHAR,
    config_snapshot JSONB,
    size_bytes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── app_environments (FK → applications) ────────────────────────────
CREATE TABLE IF NOT EXISTS app_environments (
    id SERIAL PRIMARY KEY,
    parent_app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    name VARCHAR,
    app_secret VARCHAR,
    owner_id VARCHAR UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_app_environments_owner_id ON app_environments (owner_id);

-- ── health_check_records (FK → applications) ────────────────────────
CREATE TABLE IF NOT EXISTS health_check_records (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    endpoint VARCHAR,
    status_code INTEGER,
    response_time_ms INTEGER,
    is_up BOOLEAN,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── log_retention_configs (FK → applications) ───────────────────────
CREATE TABLE IF NOT EXISTS log_retention_configs (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE UNIQUE,
    retention_days INTEGER DEFAULT 30,
    auto_cleanup BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════
-- PART 8: ORGANIZATION / USAGE / AUTOMATION
-- ════════════════════════════════════════════════════════════════════

-- ── organizations (FK → developer_accounts) ─────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    owner_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    slug VARCHAR UNIQUE,
    logo_url VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── organization_members (FK → organizations, developer_accounts x2) ─
CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations (id) ON DELETE CASCADE,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    role VARCHAR,
    invited_by INTEGER REFERENCES developer_accounts (id),
    is_accepted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── usage_records (FK → developer_accounts) ─────────────────────────
CREATE TABLE IF NOT EXISTS usage_records (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    metric VARCHAR,
    quantity INTEGER DEFAULT 0,
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── custom_plan_overrides (FK → developer_accounts) ─────────────────
CREATE TABLE IF NOT EXISTS custom_plan_overrides (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    feature_key VARCHAR,
    feature_value JSONB,
    label VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── scheduled_actions (FK → developer_accounts, applications) ───────
CREATE TABLE IF NOT EXISTS scheduled_actions (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developer_accounts (id) ON DELETE CASCADE,
    app_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
    action_type VARCHAR,
    target_type VARCHAR,
    target_filter JSONB,
    payload JSONB,
    status VARCHAR DEFAULT 'pending',
    result_summary JSONB,
    scheduled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════
-- PART 9: TRIGGER — auto-create developer_accounts on Supabase signup
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    local_part TEXT;
    candidate_username TEXT;
    base_plan_id INTEGER;
BEGIN
    local_part := split_part(NEW.email, '@', 1);
    IF local_part IS NULL OR local_part = '' THEN
        candidate_username := 'user_' || substr(NEW.id::text, 1, 8);
    ELSE
        candidate_username := local_part;
    END IF;

    SELECT id INTO base_plan_id FROM subscription_plans
        WHERE is_active = TRUE ORDER BY sort_order ASC LIMIT 1;

    INSERT INTO developer_accounts (
        username, email, supabase_user_id, password_hash,
        subscription_tier, plan_id, is_verified
    )
    VALUES (
        candidate_username,
        COALESCE(NEW.email, ''),
        NEW.id,
        '',
        'tester',
        base_plan_id,
        COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE)
    )
    ON CONFLICT (supabase_user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO anon, authenticated, service_role;


-- ════════════════════════════════════════════════════════════════════
-- PART 10: SEED DATA (plans + settings + payment methods)
-- ════════════════════════════════════════════════════════════════════

-- ── Subscription Plans (4) ──────────────────────────────────────────
INSERT INTO subscription_plans (
    name, description, price_monthly, price_yearly, discount,
    badge_text, badge_color, is_recommended, button_text, button_color,
    icon, sort_order, is_active,
    max_apps, max_licenses, max_users_per_app, max_keys_per_month,
    max_variables, max_logs, max_hashes, max_staff, max_chatrooms,
    features_json, ai_agent_access, audit_log_limit,
    has_ip_tracking, has_location_tracking, has_user_panel, has_staff_management,
    has_discord_integration, has_telegram_integration, has_api_access,
    has_custom_domain, has_live_chat, has_audit_logs, has_webhooks,
    has_white_label, has_priority_support, has_ssl, has_global_chat,
    has_custom_bot, has_behavioral_threat_intel, has_version_whitelist
) VALUES
('Free',
 'Essential auth, HWID lock, license keys, 2 apps',
 0, 0, 0, '', '', FALSE, 'Get Started', 'var(--primary)',
 'explore', 1, TRUE,
 2, 50, 50, 100, 40, 200, 2, 0, 0,
 '["Basic Auth","HWID Lock","License Keys"]'::jsonb, FALSE, 500,
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE),
('Developer',
 'AI agent, webhooks, team mgmt, IP tracking, user panel',
 99, 999, 16, '', '', TRUE, 'Choose Plan', '#3b82f6',
 'workspace_premium', 2, TRUE,
 20, 10000, 10000, 50000, 999999, 5000, 20, 10, 0,
 '["Team Management","Customer Panel","Functions","Webhooks"]'::jsonb, TRUE, 10000,
 TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, TRUE,
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE),
('Seller',
 'Chatrooms, Discord/Telegram bots, seller API, unlimited',
 199, 1999, 16, 'BEST VALUE', '#10b981', FALSE, 'Choose Plan', 'var(--primary)',
 'rocket', 3, TRUE,
 999999, 999999, 999999, 999999, 999999, 999999, 999999, 999999, 999999,
 '["Chatrooms","Discord Bot","Telegram Bot","Seller API"]'::jsonb, TRUE, 50000,
 TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE,
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE),
('Enterprise',
 'White-label, custom domain, SSL, dedicated priority support',
 299, 2999, 16, '', '', FALSE, 'Contact Sales', 'var(--primary)',
 'diamond', 4, TRUE,
 999999, 999999, 999999, 999999, 999999, 999999, 999999, 999999, 999999,
 '["Team Management","Customer Panel","Functions","Chatrooms","Discord Bot","Telegram Bot","Seller API","Priority AI","White Label","Dedicated Support"]'::jsonb,
 TRUE, 100000,
 TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
 TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    is_recommended = EXCLUDED.is_recommended,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    features_json = EXCLUDED.features_json;

-- ── System Settings ─────────────────────────────────────────────────
INSERT INTO system_settings (key, value, description) VALUES
  ('system_mode',         'live',                                                                                          'Platform operational mode'),
  ('maintenance_mode',    'false',                                                                                        'Legacy maintenance flag'),
  ('platform_name',       'AuthSys',                                                                                      'Public platform name'),
  ('platform_logo',       '/logo.png',                                                                                    'Logo URL'),
  ('platform_favicon',    '/favicon.ico',                                                                                 'Favicon URL'),
  ('watch_demo_url',      'https://youtube.com/watch?v=demo',                                                             'Hero demo video URL'),
  ('landing_paragraph',   'The modern standard for software authentication, license management, and AI-powered threat protection.', 'Landing hero text'),
  ('contact_email',       'support@authsys.com',                                                                          'Support email'),
  ('contact_phone',       '+1 (800) 123-4567',                                                                            'Support phone'),
  ('contact_address',     'San Francisco, CA',                                                                            'Office address'),
  ('strict_hwid',         'false',                                                                                        'Strict HWID enforcement'),
  ('ip_risk_scoring',     'false',                                                                                        'IP risk scoring'),
  ('developer_2fa',       'false',                                                                                        'Mandatory developer 2FA'),
  ('rate_limiting',       'true',                                                                                         'API rate limiting'),
  ('ai_provider',         'google',                                                                                       'AI provider id'),
  ('ai_model',            'gemini-2.0-flash',                                                                             'AI model id'),
  ('ai_enabled',          'true',                                                                                         'AI assistant enabled')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

-- ── Payment Methods (bKash, Nagad, Card) ────────────────────────────
INSERT INTO payment_methods (name, type, instructions, exchange_rate, icon_name, is_active)
SELECT * FROM (VALUES
  ('bKash', 'local',         'Send Money (Personal) to: 01700000000', 120, 'phone_iphone', TRUE),
  ('Nagad', 'local',         'Send Money (Personal) to: 01800000000', 120, 'phone_android', TRUE),
  ('Card',  'international', 'We accept Visa, Mastercard, and Amex via manual processing.', 1, 'credit_card', TRUE)
) AS v(name, type, instructions, exchange_rate, icon_name, is_active)
WHERE NOT EXISTS (SELECT 1 FROM payment_methods LIMIT 1);


-- ════════════════════════════════════════════════════════════════════
-- DONE — verification
-- ════════════════════════════════════════════════════════════════════
SELECT '✅ SCHEMA + SEED COMPLETE' AS status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS total_tables;
