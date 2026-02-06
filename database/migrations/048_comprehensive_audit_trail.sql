-- =====================================================
-- COMPREHENSIVE AUDIT TRAIL SYSTEM
-- Migration 048: Enhanced audit logging for BSP/BIR compliance
--
-- Features:
-- - Comprehensive audit logging for all sensitive operations
-- - User actions (login, logout, profile changes)
-- - Admin actions (user modifications, system changes)
-- - Payment transactions (already implemented, enhance here)
-- - Data access audit (who viewed what, when)
-- - Audit log viewer for admins
-- - BSP/BIR compliance (7-year retention)
-- - Search and filter capabilities
-- - Export functionality (CSV/JSON)
--
-- Compliance: BSP, BIR, DPA, LTFRB
-- Issue: #27 (P1 - 12 hours)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =====================================================
-- AUDIT LOG TABLES
-- =====================================================

-- Comprehensive audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Event identification
    event_id VARCHAR(100) UNIQUE NOT NULL, -- For idempotency
    event_type VARCHAR(100) NOT NULL, -- login, logout, data_access, admin_action, payment, etc.
    event_category VARCHAR(50) NOT NULL, -- auth, user, admin, payment, data_access, system
    security_level VARCHAR(20) NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL

    -- Actor (who performed the action)
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(100),

    -- Target (what was acted upon)
    target_type VARCHAR(100), -- user, booking, payment, driver, etc.
    target_id VARCHAR(255), -- ID of the target resource
    target_description TEXT,

    -- Action details
    action VARCHAR(100) NOT NULL, -- create, read, update, delete, approve, reject, etc.
    resource VARCHAR(100) NOT NULL, -- users, bookings, payments, etc.
    outcome VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILURE, WARNING

    -- Context
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    http_method VARCHAR(10), -- GET, POST, PUT, DELETE
    endpoint TEXT, -- API endpoint or page URL
    request_id VARCHAR(100), -- For tracing

    -- Data changes (for compliance)
    old_values JSONB, -- Before state
    new_values JSONB, -- After state
    changes JSONB, -- Diff of changes

    -- Metadata and details
    details JSONB DEFAULT '{}',
    error_message TEXT,
    stack_trace TEXT,

    -- Risk and compliance
    risk_score DECIMAL(3,2) DEFAULT 0.0,
    risk_factors TEXT[],
    requires_review BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),

    -- Compliance and retention
    retention_required_until DATE, -- For 7-year BSP/BIR retention
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Regional context
    region_id UUID REFERENCES regions(id),

    -- Constraints
    CONSTRAINT audit_logs_security_level CHECK (security_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT audit_logs_outcome CHECK (outcome IN ('SUCCESS', 'FAILURE', 'WARNING', 'PARTIAL')),
    CONSTRAINT audit_logs_risk_score CHECK (risk_score >= 0.0 AND risk_score <= 10.0)
);

-- Data access audit (specific for PII/sensitive data viewing)
CREATE TABLE IF NOT EXISTS data_access_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who accessed
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    user_role VARCHAR(100),

    -- What was accessed
    data_type VARCHAR(100) NOT NULL, -- user_profile, payment_details, driver_license, etc.
    data_id VARCHAR(255) NOT NULL, -- ID of the accessed record
    data_owner_id UUID, -- The user whose data was accessed
    data_classification VARCHAR(50) NOT NULL, -- public, internal, confidential, restricted

    -- Access details
    access_type VARCHAR(50) NOT NULL, -- view, export, unmask, download
    access_reason TEXT, -- Justification (required for sensitive data)
    access_granted_by VARCHAR(100), -- MFA, approval workflow, etc.

    -- Context
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    endpoint TEXT,

    -- MFA verification (for highly sensitive data)
    mfa_verified BOOLEAN DEFAULT FALSE,
    mfa_challenge_id VARCHAR(100),

    -- Approval workflow (for cross-region access)
    approval_required BOOLEAN DEFAULT FALSE,
    approval_id UUID REFERENCES approvals(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Retention
    retention_required_until DATE,

    -- Constraints
    CONSTRAINT data_access_data_classification CHECK (
        data_classification IN ('public', 'internal', 'confidential', 'restricted')
    ),
    CONSTRAINT data_access_type CHECK (
        access_type IN ('view', 'export', 'unmask', 'download', 'modify')
    )
);

-- Payment transaction audit (enhanced from existing)
CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Transaction identification
    transaction_id VARCHAR(255) NOT NULL,
    payment_id UUID,
    booking_id UUID,

    -- Event details
    event_type VARCHAR(100) NOT NULL, -- payment_initiated, payment_completed, refund_issued, etc.
    payment_method VARCHAR(50), -- gcash, maya, cash, card
    payment_gateway VARCHAR(50), -- EBANX, Xendit, etc.

    -- Amounts (for BSP/BIR reporting)
    amount DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'PHP',
    fee_amount DECIMAL(12, 2),
    net_amount DECIMAL(12, 2),

    -- Parties involved
    payer_id UUID REFERENCES users(id),
    payee_id UUID REFERENCES users(id),
    merchant_id VARCHAR(255),

    -- Status and outcome
    status VARCHAR(50) NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT,

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,

    -- Compliance
    bir_transaction_id VARCHAR(255), -- BIR reporting reference
    bsp_transaction_id VARCHAR(255), -- BSP reporting reference
    tax_amount DECIMAL(12, 2),
    tax_rate DECIMAL(5, 4),

    -- Metadata
    gateway_response JSONB,
    metadata JSONB DEFAULT '{}',

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Retention (7 years for financial records)
    retention_required_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 years'),

    -- Constraints
    CONSTRAINT payment_audit_outcome CHECK (outcome IN ('SUCCESS', 'FAILURE', 'PENDING', 'WARNING'))
);

-- Admin action audit (administrative operations)
CREATE TABLE IF NOT EXISTS admin_action_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Admin who performed action
    admin_user_id UUID NOT NULL REFERENCES users(id),
    admin_email VARCHAR(255),
    admin_role VARCHAR(100),

    -- Action details
    action_type VARCHAR(100) NOT NULL, -- user_created, role_assigned, config_changed, etc.
    action_category VARCHAR(50) NOT NULL, -- user_management, system_config, security, compliance

    -- Target of action
    target_type VARCHAR(100),
    target_id VARCHAR(255),
    target_description TEXT,

    -- Changes made
    old_values JSONB,
    new_values JSONB,
    changes_summary TEXT,

    -- Justification
    reason TEXT NOT NULL, -- Required for admin actions
    approval_required BOOLEAN DEFAULT FALSE,
    approval_id UUID,

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,

    -- MFA verification (required for sensitive admin actions)
    mfa_verified BOOLEAN DEFAULT FALSE,
    mfa_challenge_id VARCHAR(100),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Retention
    retention_required_until DATE,

    -- Constraints
    CONSTRAINT admin_action_category CHECK (
        action_category IN ('user_management', 'system_config', 'security', 'compliance', 'emergency')
    )
);

-- System event audit (system-level events)
CREATE TABLE IF NOT EXISTS system_event_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Event details
    event_type VARCHAR(100) NOT NULL, -- system_startup, config_reload, migration_run, etc.
    event_category VARCHAR(50) NOT NULL, -- system, deployment, maintenance, error
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO', -- INFO, WARNING, ERROR, CRITICAL

    -- Event description
    title TEXT NOT NULL,
    description TEXT,

    -- System context
    hostname VARCHAR(255),
    environment VARCHAR(50), -- production, staging, development
    version VARCHAR(50),
    deployment_id VARCHAR(100),

    -- Details
    details JSONB DEFAULT '{}',
    error_message TEXT,
    stack_trace TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT system_event_severity CHECK (
        severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')
    )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_security_level ON audit_logs(security_level, created_at DESC) WHERE security_level IN ('HIGH', 'CRITICAL');
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_requires_review ON audit_logs(requires_review, created_at DESC) WHERE requires_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention ON audit_logs(retention_required_until) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_id ON audit_logs(event_id);

-- Full-text search index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_search ON audit_logs USING gin(
    to_tsvector('english',
        COALESCE(event_type, '') || ' ' ||
        COALESCE(action, '') || ' ' ||
        COALESCE(resource, '') || ' ' ||
        COALESCE(target_description, '') || ' ' ||
        COALESCE(error_message, '')
    )
);

-- data_access_audit indexes
CREATE INDEX IF NOT EXISTS idx_data_access_user ON data_access_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_data_type ON data_access_audit(data_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_data_owner ON data_access_audit(data_owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_classification ON data_access_audit(data_classification, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_sensitive ON data_access_audit(data_classification, created_at DESC) WHERE data_classification IN ('confidential', 'restricted');
CREATE INDEX IF NOT EXISTS idx_data_access_mfa ON data_access_audit(mfa_verified, created_at DESC) WHERE data_classification = 'restricted';

-- payment_audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_payment_audit_transaction ON payment_audit_logs(transaction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_audit_payment ON payment_audit_logs(payment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_audit_payer ON payment_audit_logs(payer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created_at ON payment_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_audit_status ON payment_audit_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_audit_bir ON payment_audit_logs(bir_transaction_id) WHERE bir_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_audit_bsp ON payment_audit_logs(bsp_transaction_id) WHERE bsp_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_audit_retention ON payment_audit_logs(retention_required_until);

-- admin_action_audit indexes
CREATE INDEX IF NOT EXISTS idx_admin_action_admin ON admin_action_audit(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_type ON admin_action_audit(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_category ON admin_action_audit(action_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_target ON admin_action_audit(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_mfa ON admin_action_audit(mfa_verified, created_at DESC);

-- system_event_audit indexes
CREATE INDEX IF NOT EXISTS idx_system_event_type ON system_event_audit(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_event_severity ON system_event_audit(severity, created_at DESC) WHERE severity IN ('ERROR', 'CRITICAL');
CREATE INDEX IF NOT EXISTS idx_system_event_created_at ON system_event_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_event_environment ON system_event_audit(environment, created_at DESC);

-- =====================================================
-- VIEWS FOR AUDIT LOG QUERIES
-- =====================================================

-- View: Recent audit events
CREATE OR REPLACE VIEW v_recent_audit_events AS
SELECT
    id,
    event_id,
    event_type,
    event_category,
    security_level,
    user_email,
    action,
    resource,
    outcome,
    created_at,
    ip_address,
    requires_review
FROM audit_logs
WHERE created_at > (NOW() - INTERVAL '7 days')
ORDER BY created_at DESC
LIMIT 1000;

-- View: High-risk audit events requiring review
CREATE OR REPLACE VIEW v_audit_events_requiring_review AS
SELECT
    al.id,
    al.event_id,
    al.event_type,
    al.security_level,
    al.user_id,
    al.user_email,
    al.action,
    al.resource,
    al.target_type,
    al.target_id,
    al.risk_score,
    al.risk_factors,
    al.created_at,
    al.reviewed_at,
    al.reviewed_by,
    ru.email as reviewed_by_email
FROM audit_logs al
LEFT JOIN users ru ON al.reviewed_by = ru.id
WHERE al.requires_review = TRUE
    AND al.reviewed_at IS NULL
ORDER BY al.risk_score DESC, al.created_at DESC;

-- View: Audit statistics by category
CREATE OR REPLACE VIEW v_audit_statistics AS
SELECT
    event_category,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE outcome = 'SUCCESS') as successful_events,
    COUNT(*) FILTER (WHERE outcome = 'FAILURE') as failed_events,
    COUNT(*) FILTER (WHERE security_level = 'CRITICAL') as critical_events,
    COUNT(*) FILTER (WHERE requires_review = TRUE) as events_requiring_review,
    MAX(created_at) as last_event_at
FROM audit_logs
WHERE created_at > (NOW() - INTERVAL '30 days')
GROUP BY event_category
ORDER BY total_events DESC;

-- View: User activity summary
CREATE OR REPLACE VIEW v_user_activity_summary AS
SELECT
    user_id,
    user_email,
    COUNT(*) as total_actions,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    MAX(created_at) as last_activity_at,
    COUNT(*) FILTER (WHERE event_category = 'auth') as auth_events,
    COUNT(*) FILTER (WHERE security_level = 'HIGH') as high_risk_events,
    COUNT(*) FILTER (WHERE outcome = 'FAILURE') as failed_actions
FROM audit_logs
WHERE user_id IS NOT NULL
    AND created_at > (NOW() - INTERVAL '30 days')
GROUP BY user_id, user_email
ORDER BY total_actions DESC;

-- =====================================================
-- FUNCTIONS FOR AUDIT LOGGING
-- =====================================================

-- Function: Log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
    p_event_id VARCHAR,
    p_event_type VARCHAR,
    p_event_category VARCHAR,
    p_user_id UUID DEFAULT NULL,
    p_action VARCHAR DEFAULT NULL,
    p_resource VARCHAR DEFAULT NULL,
    p_outcome VARCHAR DEFAULT 'SUCCESS',
    p_security_level VARCHAR DEFAULT 'LOW',
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    retention_date DATE;
BEGIN
    -- Calculate retention date (7 years for financial, 3 years for others)
    IF p_event_category IN ('payment', 'compliance') THEN
        retention_date := CURRENT_DATE + INTERVAL '7 years';
    ELSE
        retention_date := CURRENT_DATE + INTERVAL '3 years';
    END IF;

    INSERT INTO audit_logs (
        event_id, event_type, event_category, user_id, action,
        resource, outcome, security_level, details, ip_address,
        session_id, retention_required_until
    )
    VALUES (
        p_event_id, p_event_type, p_event_category, p_user_id, p_action,
        p_resource, p_outcome, p_security_level, p_details, p_ip_address,
        p_session_id, retention_date
    )
    RETURNING id INTO audit_id;

    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Archive old audit logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Archive logs beyond retention period
    UPDATE audit_logs
    SET archived = TRUE, archived_at = NOW()
    WHERE retention_required_until < CURRENT_DATE
        AND archived = FALSE;

    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup archived logs (after safe backup)
CREATE OR REPLACE FUNCTION cleanup_archived_logs(older_than_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Only delete archived logs older than specified days (safety buffer)
    DELETE FROM audit_logs
    WHERE archived = TRUE
        AND archived_at < (NOW() - (older_than_days || ' days')::INTERVAL);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC AUDIT LOGGING
-- =====================================================

-- Trigger function for user table changes
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            event_id, event_type, event_category, user_id, action,
            resource, outcome, old_values, new_values
        )
        VALUES (
            'user_' || NEW.id || '_' || extract(epoch from NOW())::TEXT,
            'user_modified',
            'user',
            NEW.updated_by,
            'update',
            'users',
            'SUCCESS',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            event_id, event_type, event_category, user_id, action,
            resource, outcome, old_values
        )
        VALUES (
            'user_' || OLD.id || '_' || extract(epoch from NOW())::TEXT,
            'user_deleted',
            'user',
            OLD.updated_by,
            'delete',
            'users',
            'SUCCESS',
            to_jsonb(OLD)
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to users table
DROP TRIGGER IF EXISTS tr_audit_user_changes ON users;
CREATE TRIGGER tr_audit_user_changes
    AFTER UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_user_changes();

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system events with BSP/BIR compliance (7-year retention for financial data)';
COMMENT ON TABLE data_access_audit IS 'Specific audit trail for PII and sensitive data access';
COMMENT ON TABLE payment_audit_logs IS 'Payment transaction audit with BSP/BIR compliance requirements';
COMMENT ON TABLE admin_action_audit IS 'Administrative action audit trail with MFA verification tracking';
COMMENT ON TABLE system_event_audit IS 'System-level event audit for deployments, errors, and maintenance';

COMMENT ON COLUMN audit_logs.retention_required_until IS 'Date until which the log must be retained (7 years for financial, 3 years for others)';
COMMENT ON COLUMN data_access_audit.mfa_verified IS 'Whether MFA was verified for this sensitive data access';
COMMENT ON COLUMN payment_audit_logs.retention_required_until IS 'BSP/BIR requires 7-year retention for financial records';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 048_comprehensive_audit_trail.sql completed successfully';
    RAISE NOTICE 'Audit tables created: audit_logs, data_access_audit, payment_audit_logs, admin_action_audit, system_event_audit';
    RAISE NOTICE 'Views created: v_recent_audit_events, v_audit_events_requiring_review, v_audit_statistics, v_user_activity_summary';
    RAISE NOTICE 'Functions created: log_audit_event, archive_old_audit_logs, cleanup_archived_logs';
    RAISE NOTICE 'BSP/BIR compliance: 7-year retention for financial data, 3-year for operational data';
END $$;
