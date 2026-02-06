-- =====================================================
-- MFA SYSTEM COMPLETE IMPLEMENTATION
-- Migration 047: Multi-Factor Authentication with TOTP, Backup Codes, Recovery
--
-- Features:
-- - TOTP-based 2FA with QR code generation
-- - Backup codes (10 codes, single-use)
-- - MFA enrollment and verification flow
-- - Recovery flow for lost devices
-- - Admin enforcement options
-- - Comprehensive audit logging
--
-- Compliance: BSP, BIR, DPA, LTFRB
-- Issue: #16 (P1 - 12 hours)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MFA TABLES
-- =====================================================

-- User MFA settings table
CREATE TABLE IF NOT EXISTS user_mfa_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- MFA enabled status
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_enforced BOOLEAN DEFAULT FALSE, -- Admin can enforce MFA

    -- TOTP settings (Time-based One-Time Password)
    totp_enabled BOOLEAN DEFAULT FALSE,
    totp_secret TEXT, -- Encrypted TOTP secret (base32)
    totp_verified_at TIMESTAMP WITH TIME ZONE,

    -- SMS settings
    sms_enabled BOOLEAN DEFAULT FALSE,
    sms_phone VARCHAR(20), -- Encrypted phone number
    sms_verified_at TIMESTAMP WITH TIME ZONE,

    -- Email settings
    email_enabled BOOLEAN DEFAULT FALSE,
    email_address VARCHAR(255), -- Encrypted email
    email_verified_at TIMESTAMP WITH TIME ZONE,

    -- Preferred MFA method
    preferred_method VARCHAR(20) DEFAULT 'totp', -- totp, sms, email

    -- Backup codes (10 codes, single-use)
    backup_codes JSONB DEFAULT '[]', -- Array of hashed backup codes
    backup_codes_generated_at TIMESTAMP WITH TIME ZONE,
    backup_codes_remaining INTEGER DEFAULT 0,

    -- Recovery settings
    recovery_email VARCHAR(255), -- Encrypted recovery email
    recovery_phone VARCHAR(20), -- Encrypted recovery phone

    -- Trusted devices (optional - for "remember this device")
    trusted_devices JSONB DEFAULT '[]',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(user_id),
    CONSTRAINT mfa_settings_backup_codes_count CHECK (backup_codes_remaining >= 0 AND backup_codes_remaining <= 10),
    CONSTRAINT mfa_settings_preferred_method CHECK (preferred_method IN ('totp', 'sms', 'email', 'backup_code'))
);

-- MFA challenges table (for SMS/Email codes)
CREATE TABLE IF NOT EXISTS mfa_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id VARCHAR(100) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Challenge details
    method VARCHAR(20) NOT NULL, -- sms, email, totp
    code_hash TEXT NOT NULL, -- Hashed verification code

    -- Challenge lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Attempt tracking
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    locked_at TIMESTAMP WITH TIME ZONE,

    -- Context
    action VARCHAR(100), -- login, sensitive_operation, etc.
    ip_address INET,
    user_agent TEXT,

    -- Metadata for delivery
    metadata JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, expired, locked

    -- Constraints
    CONSTRAINT mfa_challenges_method CHECK (method IN ('sms', 'email', 'totp', 'backup_code')),
    CONSTRAINT mfa_challenges_status CHECK (status IN ('pending', 'verified', 'expired', 'locked', 'cancelled')),
    CONSTRAINT mfa_challenges_attempts CHECK (attempts >= 0 AND attempts <= max_attempts)
);

-- MFA backup codes table (for tracking individual codes)
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Code details
    code_hash TEXT NOT NULL UNIQUE, -- Hashed backup code
    code_index INTEGER NOT NULL, -- Which code in the set (1-10)

    -- Usage tracking
    used_at TIMESTAMP WITH TIME ZONE,
    used_ip INET,
    used_user_agent TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry

    -- Constraints
    CONSTRAINT mfa_backup_codes_index CHECK (code_index >= 1 AND code_index <= 10),
    UNIQUE(user_id, code_index)
);

-- MFA enrollment audit log
CREATE TABLE IF NOT EXISTS mfa_enrollment_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(50) NOT NULL, -- setup_initiated, setup_completed, method_enabled, method_disabled, backup_codes_generated, backup_code_used, recovery_initiated
    method VARCHAR(20), -- totp, sms, email, backup_code

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,

    -- Result
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT mfa_enrollment_event_type CHECK (event_type IN (
        'setup_initiated', 'setup_completed', 'setup_cancelled',
        'method_enabled', 'method_disabled',
        'backup_codes_generated', 'backup_code_used', 'backup_codes_regenerated',
        'recovery_initiated', 'recovery_completed',
        'verification_success', 'verification_failed',
        'mfa_enforced', 'mfa_disabled',
        'trusted_device_added', 'trusted_device_removed'
    ))
);

-- MFA recovery requests table
CREATE TABLE IF NOT EXISTS mfa_recovery_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Recovery request details
    recovery_token TEXT NOT NULL UNIQUE,
    recovery_method VARCHAR(20) NOT NULL, -- email, phone, admin_reset

    -- Contact information used for recovery
    recovery_contact TEXT, -- Encrypted email/phone used

    -- Request lifecycle
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Admin approval (for admin_reset method)
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, completed, expired, rejected

    -- Constraints
    CONSTRAINT mfa_recovery_method CHECK (recovery_method IN ('email', 'phone', 'admin_reset')),
    CONSTRAINT mfa_recovery_status CHECK (status IN ('pending', 'verified', 'completed', 'expired', 'rejected', 'cancelled'))
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User MFA settings indexes
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user ON user_mfa_settings(user_id) WHERE mfa_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_enabled ON user_mfa_settings(mfa_enabled, mfa_enforced);
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_last_used ON user_mfa_settings(last_used_at DESC) WHERE mfa_enabled = TRUE;

-- MFA challenges indexes
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_challenge_id ON mfa_challenges(challenge_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user ON mfa_challenges(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_status ON mfa_challenges(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expiry ON mfa_challenges(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_ip ON mfa_challenges(ip_address, created_at DESC);

-- MFA backup codes indexes
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user ON mfa_backup_codes(user_id) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_hash ON mfa_backup_codes(code_hash) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_unused ON mfa_backup_codes(user_id, used_at) WHERE used_at IS NULL;

-- MFA enrollment audit indexes
CREATE INDEX IF NOT EXISTS idx_mfa_enrollment_audit_user ON mfa_enrollment_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_enrollment_audit_event ON mfa_enrollment_audit(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_enrollment_audit_session ON mfa_enrollment_audit(session_id, created_at DESC);

-- MFA recovery requests indexes
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_user ON mfa_recovery_requests(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_token ON mfa_recovery_requests(recovery_token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_status ON mfa_recovery_requests(status, expires_at);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Users with MFA status
CREATE OR REPLACE VIEW v_users_mfa_status AS
SELECT
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.status as user_status,

    -- MFA settings
    COALESCE(mfa.mfa_enabled, FALSE) as mfa_enabled,
    COALESCE(mfa.mfa_enforced, FALSE) as mfa_enforced,
    mfa.totp_enabled,
    mfa.sms_enabled,
    mfa.email_enabled,
    mfa.preferred_method,
    mfa.backup_codes_remaining,
    mfa.last_used_at as mfa_last_used_at,

    -- Verification timestamps
    mfa.totp_verified_at,
    mfa.sms_verified_at,
    mfa.email_verified_at,

    -- Enrollment date
    mfa.created_at as mfa_enrolled_at

FROM users u
LEFT JOIN user_mfa_settings mfa ON u.id = mfa.user_id
WHERE u.is_active = TRUE;

-- View: Active MFA challenges
CREATE OR REPLACE VIEW v_active_mfa_challenges AS
SELECT
    c.id,
    c.challenge_id,
    c.user_id,
    u.email as user_email,
    c.method,
    c.action,
    c.created_at,
    c.expires_at,
    c.attempts,
    c.max_attempts,
    (c.max_attempts - c.attempts) as remaining_attempts,
    (c.expires_at - NOW()) as time_to_expiry,
    c.ip_address,
    c.status
FROM mfa_challenges c
JOIN users u ON c.user_id = u.id
WHERE c.status = 'pending'
    AND c.expires_at > NOW()
    AND c.attempts < c.max_attempts;

-- View: MFA enrollment statistics
CREATE OR REPLACE VIEW v_mfa_enrollment_stats AS
SELECT
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE mfa_enabled = TRUE) as mfa_enabled_count,
    COUNT(*) FILTER (WHERE mfa_enforced = TRUE) as mfa_enforced_count,
    COUNT(*) FILTER (WHERE totp_enabled = TRUE) as totp_enabled_count,
    COUNT(*) FILTER (WHERE sms_enabled = TRUE) as sms_enabled_count,
    COUNT(*) FILTER (WHERE email_enabled = TRUE) as email_enabled_count,
    COUNT(*) FILTER (WHERE backup_codes_remaining > 0) as has_backup_codes_count,
    ROUND(
        (COUNT(*) FILTER (WHERE mfa_enabled = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
        2
    ) as mfa_adoption_percentage
FROM user_mfa_settings;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mfa_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp on mfa_settings change
DROP TRIGGER IF EXISTS tr_user_mfa_settings_updated ON user_mfa_settings;
CREATE TRIGGER tr_user_mfa_settings_updated
    BEFORE UPDATE ON user_mfa_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_mfa_settings_timestamp();

-- Function: Cleanup expired MFA challenges
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_challenges()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE mfa_challenges
    SET status = 'expired'
    WHERE status = 'pending'
        AND expires_at <= NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup expired recovery requests
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_recovery()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE mfa_recovery_requests
    SET status = 'expired'
    WHERE status = 'pending'
        AND expires_at <= NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get MFA settings for user
CREATE OR REPLACE FUNCTION get_user_mfa_settings(p_user_id UUID)
RETURNS TABLE (
    mfa_enabled BOOLEAN,
    totp_enabled BOOLEAN,
    sms_enabled BOOLEAN,
    email_enabled BOOLEAN,
    preferred_method VARCHAR,
    backup_codes_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(mfa.mfa_enabled, FALSE),
        COALESCE(mfa.totp_enabled, FALSE),
        COALESCE(mfa.sms_enabled, FALSE),
        COALESCE(mfa.email_enabled, FALSE),
        COALESCE(mfa.preferred_method, 'totp'),
        COALESCE(mfa.backup_codes_remaining, 0)
    FROM users u
    LEFT JOIN user_mfa_settings mfa ON u.id = mfa.user_id
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Audit MFA enrollment event
CREATE OR REPLACE FUNCTION audit_mfa_event(
    p_user_id UUID,
    p_event_type VARCHAR,
    p_method VARCHAR DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO mfa_enrollment_audit (
        user_id, event_type, method, success, error_message,
        ip_address, user_agent, session_id, metadata
    ) VALUES (
        p_user_id, p_event_type, p_method, p_success, p_error_message,
        p_ip_address, p_user_agent, p_session_id, p_metadata
    ) RETURNING id INTO audit_id;

    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate backup codes for user
CREATE OR REPLACE FUNCTION generate_mfa_backup_codes(
    p_user_id UUID,
    p_code_hashes TEXT[]
)
RETURNS INTEGER AS $$
DECLARE
    code_count INTEGER;
    idx INTEGER;
BEGIN
    -- Delete existing unused backup codes
    DELETE FROM mfa_backup_codes
    WHERE user_id = p_user_id AND used_at IS NULL;

    -- Insert new backup codes
    FOR idx IN 1..array_length(p_code_hashes, 1)
    LOOP
        INSERT INTO mfa_backup_codes (user_id, code_hash, code_index)
        VALUES (p_user_id, p_code_hashes[idx], idx);
    END LOOP;

    -- Update mfa_settings
    UPDATE user_mfa_settings
    SET
        backup_codes_remaining = array_length(p_code_hashes, 1),
        backup_codes_generated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Audit the event
    PERFORM audit_mfa_event(
        p_user_id,
        'backup_codes_generated',
        'backup_code',
        TRUE,
        NULL,
        NULL,
        NULL,
        NULL,
        jsonb_build_object('codes_count', array_length(p_code_hashes, 1))
    );

    GET DIAGNOSTICS code_count = ROW_COUNT;
    RETURN code_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA AND DEFAULTS
-- =====================================================

-- Create MFA settings for existing users (if any)
INSERT INTO user_mfa_settings (user_id, mfa_enabled)
SELECT id, mfa_enabled
FROM users
WHERE id NOT IN (SELECT user_id FROM user_mfa_settings)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE user_mfa_settings IS 'Multi-factor authentication settings per user including TOTP, SMS, Email, and backup codes';
COMMENT ON TABLE mfa_challenges IS 'Active MFA challenges for SMS/Email verification codes';
COMMENT ON TABLE mfa_backup_codes IS 'Individual backup codes for account recovery (10 per user)';
COMMENT ON TABLE mfa_enrollment_audit IS 'Complete audit trail of all MFA-related events';
COMMENT ON TABLE mfa_recovery_requests IS 'MFA recovery requests for lost device scenarios';

COMMENT ON COLUMN user_mfa_settings.totp_secret IS 'Encrypted base32 TOTP secret for Google Authenticator/Authy';
COMMENT ON COLUMN user_mfa_settings.backup_codes IS 'DEPRECATED: Use mfa_backup_codes table instead';
COMMENT ON COLUMN user_mfa_settings.trusted_devices IS 'Optional: Device fingerprints for "remember this device" feature';
COMMENT ON COLUMN mfa_challenges.code_hash IS 'Hashed verification code (not plain text for security)';
COMMENT ON COLUMN mfa_backup_codes.code_hash IS 'Hashed backup code (SHA-256)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 047_mfa_system_complete.sql completed successfully';
    RAISE NOTICE 'MFA tables created: user_mfa_settings, mfa_challenges, mfa_backup_codes, mfa_enrollment_audit, mfa_recovery_requests';
    RAISE NOTICE 'Views created: v_users_mfa_status, v_active_mfa_challenges, v_mfa_enrollment_stats';
    RAISE NOTICE 'Functions created: cleanup_expired_mfa_challenges, cleanup_expired_mfa_recovery, get_user_mfa_settings, audit_mfa_event, generate_mfa_backup_codes';
END $$;
