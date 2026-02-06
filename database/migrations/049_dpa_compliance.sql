-- =====================================================
-- MIGRATION 049: DPA Compliance System
-- Data Privacy Act (Philippines) Compliance
-- =====================================================
-- Author: Development Coordinator
-- Date: 2026-02-07
-- Purpose: Enable DPA compliance with consent management,
--          data subject rights, and privacy policy tracking
-- Dependencies: Migration 001 (Initial Setup)
-- Related Issues: #4 (General Regulatory Compliance)
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES
('049', 'DPA compliance system with consent and data subject rights', NOW());

-- =====================================================
-- 1. DPA CONSENT TRACKING TABLE
-- =====================================================
-- Track all user consents for DPA compliance
CREATE TABLE dpa_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User Reference
    user_id UUID NOT NULL,
    user_type TEXT CHECK (user_type IN ('passenger', 'driver', 'operator', 'admin')) NOT NULL,

    -- Consent Details
    consent_type TEXT CHECK (consent_type IN (
        'essential',        -- Essential cookies/processing
        'analytics',        -- Analytics and performance
        'marketing',        -- Marketing communications
        'data_sharing',     -- Third-party data sharing
        'location_tracking',-- Location data collection
        'profile_visibility',-- Public profile visibility
        'notifications',    -- Push/SMS notifications
        'terms_of_service', -- Terms acceptance
        'privacy_policy'    -- Privacy policy acceptance
    )) NOT NULL,

    -- Consent Status
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_version VARCHAR(20) NOT NULL, -- Version of policy/terms accepted

    -- Purpose and Scope
    purpose TEXT NOT NULL,
    scope JSONB DEFAULT '{}',
    -- Example: {"data_types": ["name", "email", "location"], "retention_days": 1825}

    -- Consent Method
    consent_method TEXT CHECK (consent_method IN (
        'explicit',     -- User explicitly clicked "I agree"
        'implicit',     -- Implied by action
        'mandatory',    -- Required for service
        'opt_in',       -- User opted in
        'opt_out'       -- Default on, user can opt out
    )) NOT NULL,

    -- Consent Source
    source_page VARCHAR(500),
    source_action VARCHAR(200),
    user_agent TEXT,
    ip_address VARCHAR(45),

    -- Withdrawal
    withdrawn BOOLEAN DEFAULT false,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,

    -- Audit Trail
    consent_proof JSONB DEFAULT '{}',
    -- Example: {"timestamp": "2026-02-07T10:00:00Z", "button_clicked": "Accept All", "scroll_depth": 100}

    -- Expiry (if applicable)
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,

    -- Timestamps
    consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dpa_consents_user ON dpa_consents(user_id, user_type);
CREATE INDEX idx_dpa_consents_type ON dpa_consents(consent_type, consent_given);
CREATE INDEX idx_dpa_consents_status ON dpa_consents(consent_given, withdrawn);
CREATE INDEX idx_dpa_consents_expiry ON dpa_consents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_dpa_consents_version ON dpa_consents(consent_type, consent_version);

COMMENT ON TABLE dpa_consents IS 'DPA consent tracking for all data processing activities';

-- =====================================================
-- 2. DPA DATA SUBJECT REQUESTS TABLE
-- =====================================================
-- Track data subject rights requests (access, deletion, rectification)
CREATE TABLE dpa_data_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Request Identification
    request_id VARCHAR(50) UNIQUE NOT NULL,

    -- User Reference
    user_id UUID NOT NULL,
    user_type TEXT CHECK (user_type IN ('passenger', 'driver', 'operator', 'admin')) NOT NULL,
    user_email VARCHAR(200),
    user_phone VARCHAR(20),

    -- Request Type (DPA Rights)
    request_type TEXT CHECK (request_type IN (
        'access',           -- Right to access (data export)
        'rectification',    -- Right to rectify incorrect data
        'erasure',          -- Right to be forgotten (deletion)
        'portability',      -- Right to data portability
        'restriction',      -- Right to restrict processing
        'objection',        -- Right to object to processing
        'automated_decision' -- Rights related to automated decision-making
    )) NOT NULL,

    -- Request Details
    request_reason TEXT,
    specific_data_requested JSONB DEFAULT '[]',
    -- Example: ["personal_info", "trip_history", "payment_data"]

    -- Status
    status TEXT CHECK (status IN (
        'submitted',
        'under_review',
        'identity_verification',
        'approved',
        'processing',
        'completed',
        'rejected',
        'cancelled'
    )) DEFAULT 'submitted',

    -- Processing
    assigned_to UUID,
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',

    -- Identity Verification
    identity_verified BOOLEAN DEFAULT false,
    verification_method TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,

    -- Response
    response_data JSONB DEFAULT '{}',
    response_file_path VARCHAR(500),
    response_notes TEXT,

    -- Compliance Tracking
    deadline_date TIMESTAMP WITH TIME ZONE, -- DPA requires response within 30 days
    completed_within_deadline BOOLEAN,

    -- Rejection (if applicable)
    rejection_reason TEXT,
    rejection_legal_basis TEXT,

    -- Audit
    actions_taken JSONB DEFAULT '[]',
    -- Example: [{"action": "exported_data", "timestamp": "...", "by": "user_id"}]

    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dpa_requests_id ON dpa_data_requests(request_id);
CREATE INDEX idx_dpa_requests_user ON dpa_data_requests(user_id, user_type);
CREATE INDEX idx_dpa_requests_type ON dpa_data_requests(request_type, status);
CREATE INDEX idx_dpa_requests_status ON dpa_data_requests(status, submitted_at);
CREATE INDEX idx_dpa_requests_deadline ON dpa_data_requests(deadline_date) WHERE status NOT IN ('completed', 'rejected', 'cancelled');

COMMENT ON TABLE dpa_data_requests IS 'Data subject rights requests tracking (access, deletion, rectification)';

-- =====================================================
-- 3. DPA PROCESSING ACTIVITIES TABLE
-- =====================================================
-- Record of Processing Activities (ROPA) - DPA requirement
CREATE TABLE dpa_processing_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Activity Identification
    activity_name VARCHAR(200) NOT NULL,
    activity_code VARCHAR(50) UNIQUE NOT NULL,

    -- Processing Purpose
    purpose TEXT NOT NULL,
    legal_basis TEXT CHECK (legal_basis IN (
        'consent',              -- User consent
        'contract',             -- Contractual necessity
        'legal_obligation',     -- Compliance with law
        'vital_interests',      -- Protection of vital interests
        'public_interest',      -- Public interest or official authority
        'legitimate_interests'  -- Legitimate interests
    )) NOT NULL,

    -- Data Categories
    data_categories JSONB NOT NULL DEFAULT '[]',
    -- Example: ["name", "email", "phone", "location", "payment_info", "trip_history"]

    -- Data Subjects
    data_subject_categories JSONB NOT NULL DEFAULT '[]',
    -- Example: ["passengers", "drivers", "operators"]

    -- Recipients (who receives the data)
    recipients JSONB DEFAULT '[]',
    -- Example: ["payment_processors", "mapping_services", "analytics_providers"]

    -- Cross-border Transfers
    international_transfers BOOLEAN DEFAULT false,
    transfer_countries JSONB DEFAULT '[]',
    transfer_safeguards TEXT,

    -- Retention
    retention_period_days INTEGER,
    retention_criteria TEXT,

    -- Security Measures
    security_measures JSONB DEFAULT '[]',
    -- Example: ["encryption", "access_control", "audit_logging", "regular_backups"]

    -- DPO Review
    dpo_reviewed BOOLEAN DEFAULT false,
    dpo_review_date TIMESTAMP WITH TIME ZONE,
    dpo_notes TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dpa_processing_active ON dpa_processing_activities(is_active);
CREATE INDEX idx_dpa_processing_legal_basis ON dpa_processing_activities(legal_basis);
CREATE INDEX idx_dpa_processing_international ON dpa_processing_activities(international_transfers);

COMMENT ON TABLE dpa_processing_activities IS 'Record of Processing Activities (ROPA) for DPA compliance';

-- =====================================================
-- 4. DPA PRIVACY NOTICES TABLE
-- =====================================================
-- Version control for privacy policies and notices
CREATE TABLE dpa_privacy_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Notice Details
    notice_type TEXT CHECK (notice_type IN (
        'privacy_policy',
        'cookie_policy',
        'terms_of_service',
        'data_sharing_notice',
        'privacy_notice'
    )) NOT NULL,

    -- Version Control
    version VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,

    -- Content
    content TEXT NOT NULL,
    content_html TEXT,
    summary TEXT,

    -- Language
    language VARCHAR(5) DEFAULT 'en',

    -- Effective Dates
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_until TIMESTAMP WITH TIME ZONE,

    -- Status
    is_current BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,

    -- Change Log
    changes_from_previous TEXT,
    change_summary JSONB DEFAULT '[]',

    -- Approval
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Display Requirements
    requires_acceptance BOOLEAN DEFAULT true,
    acceptance_required_for TEXT[], -- Which user actions require accepting this

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure only one current version per type and language
    CONSTRAINT unique_current_notice UNIQUE (notice_type, language, is_current)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_dpa_privacy_notices_type ON dpa_privacy_notices(notice_type, is_current);
CREATE INDEX idx_dpa_privacy_notices_version ON dpa_privacy_notices(notice_type, version);
CREATE INDEX idx_dpa_privacy_notices_effective ON dpa_privacy_notices(effective_from, effective_until);

COMMENT ON TABLE dpa_privacy_notices IS 'Version-controlled privacy policies and notices';

-- =====================================================
-- 5. INSURANCE VERIFICATION TABLE
-- =====================================================
-- Track driver/vehicle insurance compliance
CREATE TABLE insurance_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Insurance Identification
    policy_number VARCHAR(100) NOT NULL,
    provider_name VARCHAR(200) NOT NULL,

    -- Coverage Type
    insurance_type TEXT CHECK (insurance_type IN (
        'vehicle_comprehensive',    -- Comprehensive vehicle insurance
        'vehicle_third_party',      -- Third-party liability
        'passenger_liability',      -- Passenger accident insurance
        'driver_personal',          -- Driver personal accident
        'compulsory_tpl'           -- Compulsory third-party liability (CTPL)
    )) NOT NULL,

    -- Insured Entity
    driver_id UUID,
    vehicle_id UUID,

    -- Coverage Details
    coverage_amount DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'PHP',
    coverage_scope JSONB DEFAULT '{}',
    -- Example: {"bodily_injury": 100000, "property_damage": 50000, "medical": 25000}

    -- Policy Period
    effective_date DATE NOT NULL,
    expiry_date DATE NOT NULL,

    -- Verification Status
    verification_status TEXT CHECK (verification_status IN (
        'pending',
        'verified',
        'expired',
        'invalid',
        'cancelled'
    )) DEFAULT 'pending',

    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Document Storage
    policy_document_url VARCHAR(500),
    document_hash VARCHAR(64), -- SHA-256 for integrity

    -- Renewal Tracking
    renewal_reminder_sent BOOLEAN DEFAULT false,
    renewal_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,

    -- Claims History
    claims_count INTEGER DEFAULT 0,
    last_claim_date DATE,

    -- Compliance
    meets_ltfrb_requirements BOOLEAN DEFAULT false,
    compliance_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_insurance_policy ON insurance_verification(policy_number);
CREATE INDEX idx_insurance_driver ON insurance_verification(driver_id);
CREATE INDEX idx_insurance_vehicle ON insurance_verification(vehicle_id);
CREATE INDEX idx_insurance_status ON insurance_verification(verification_status, expiry_date);
CREATE INDEX idx_insurance_expiry ON insurance_verification(expiry_date) WHERE verification_status = 'verified';
CREATE INDEX idx_insurance_type ON insurance_verification(insurance_type);

COMMENT ON TABLE insurance_verification IS 'Insurance policy verification for drivers and vehicles';

-- =====================================================
-- 6. DATA RETENTION POLICIES TABLE
-- =====================================================
-- Automated data retention management
CREATE TABLE dpa_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Policy Details
    policy_name VARCHAR(200) NOT NULL,
    policy_code VARCHAR(50) UNIQUE NOT NULL,

    -- Target Data
    table_name VARCHAR(100) NOT NULL,
    data_category VARCHAR(100) NOT NULL,

    -- Retention Rules
    retention_period_days INTEGER NOT NULL,
    retention_start_field VARCHAR(100) NOT NULL, -- Field to calculate from (e.g., 'created_at')

    -- Action on Expiry
    expiry_action TEXT CHECK (expiry_action IN (
        'delete',       -- Permanently delete
        'archive',      -- Move to archive storage
        'anonymize',    -- Anonymize personal data
        'flag'          -- Just flag for manual review
    )) NOT NULL,

    -- Legal Basis
    legal_basis TEXT NOT NULL,
    regulation_reference VARCHAR(200),

    -- Exceptions
    exception_conditions JSONB DEFAULT '[]',
    -- Example: [{"condition": "active_legal_case", "extend_days": 365}]

    -- Execution
    is_active BOOLEAN DEFAULT true,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    execution_log JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_retention_policies_table ON dpa_retention_policies(table_name);
CREATE INDEX idx_retention_policies_execution ON dpa_retention_policies(next_execution_at) WHERE is_active = true;

COMMENT ON TABLE dpa_retention_policies IS 'Automated data retention policies for DPA compliance';

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to automatically set consent expiry
CREATE OR REPLACE FUNCTION set_consent_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiry for marketing/analytics consents (1 year)
    IF NEW.consent_type IN ('marketing', 'analytics') AND NEW.consent_given = true AND NEW.expires_at IS NULL THEN
        NEW.expires_at := NEW.consented_at + INTERVAL '1 year';
    END IF;

    -- Set deadline for data requests (30 days per DPA)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_consent_expiry
    BEFORE INSERT OR UPDATE ON dpa_consents
    FOR EACH ROW
    EXECUTE FUNCTION set_consent_expiry();

-- Function to set deadline for data subject requests
CREATE OR REPLACE FUNCTION set_data_request_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- DPA requires response within 30 days
    IF NEW.deadline_date IS NULL THEN
        NEW.deadline_date := NEW.submitted_at + INTERVAL '30 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_data_request_deadline
    BEFORE INSERT ON dpa_data_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_data_request_deadline();

-- Function to check deadline compliance on completion
CREATE OR REPLACE FUNCTION check_deadline_compliance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at := NOW();
        NEW.completed_within_deadline := (NEW.completed_at <= NEW.deadline_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_deadline_compliance
    BEFORE UPDATE ON dpa_data_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_deadline_compliance();

-- Function to ensure only one current privacy notice per type
CREATE OR REPLACE FUNCTION ensure_single_current_notice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        -- Set all other notices of same type and language to not current
        UPDATE dpa_privacy_notices
        SET is_current = false
        WHERE notice_type = NEW.notice_type
            AND language = NEW.language
            AND id != NEW.id
            AND is_current = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_current_notice
    AFTER INSERT OR UPDATE ON dpa_privacy_notices
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_current_notice();

-- Update updated_at timestamp triggers
CREATE TRIGGER trigger_dpa_consents_updated_at
    BEFORE UPDATE ON dpa_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_dpa_requests_updated_at
    BEFORE UPDATE ON dpa_data_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_dpa_processing_updated_at
    BEFORE UPDATE ON dpa_processing_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_dpa_privacy_notices_updated_at
    BEFORE UPDATE ON dpa_privacy_notices
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_insurance_updated_at
    BEFORE UPDATE ON insurance_verification
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_retention_policies_updated_at
    BEFORE UPDATE ON dpa_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

-- =====================================================
-- 8. MATERIALIZED VIEWS FOR REPORTING
-- =====================================================

-- Consent Overview Dashboard
CREATE MATERIALIZED VIEW dpa_consent_dashboard AS
SELECT
    consent_type,
    COUNT(*) FILTER (WHERE consent_given = true AND withdrawn = false) as active_consents,
    COUNT(*) FILTER (WHERE consent_given = false OR withdrawn = true) as inactive_consents,
    COUNT(*) FILTER (WHERE expires_at < NOW() AND withdrawn = false) as expired_consents,
    COUNT(DISTINCT user_id) as unique_users,
    consent_version as current_version
FROM dpa_consents
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY consent_type, consent_version
ORDER BY consent_type, current_version DESC;

-- Data Requests Summary
CREATE MATERIALIZED VIEW dpa_requests_summary AS
SELECT
    request_type,
    status,
    COUNT(*) as request_count,
    COUNT(*) FILTER (WHERE completed_within_deadline = true) as completed_on_time,
    COUNT(*) FILTER (WHERE completed_within_deadline = false) as completed_late,
    COUNT(*) FILTER (WHERE deadline_date < NOW() AND status NOT IN ('completed', 'rejected', 'cancelled')) as overdue,
    AVG(EXTRACT(EPOCH FROM (completed_at - submitted_at))/86400) as avg_completion_days
FROM dpa_data_requests
WHERE submitted_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY request_type, status
ORDER BY request_type, status;

-- Insurance Expiry Dashboard
CREATE MATERIALIZED VIEW insurance_expiry_dashboard AS
SELECT
    insurance_type,
    verification_status,
    COUNT(*) as policy_count,
    COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND verification_status = 'verified') as expiring_soon,
    COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) as expired,
    MIN(expiry_date) as earliest_expiry,
    MAX(expiry_date) as latest_expiry
FROM insurance_verification
GROUP BY insurance_type, verification_status
ORDER BY insurance_type, verification_status;

-- =====================================================
-- 9. ROW-LEVEL SECURITY
-- =====================================================

ALTER TABLE dpa_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpa_data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpa_processing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpa_privacy_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpa_retention_policies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. SEED DATA - INITIAL PRIVACY POLICIES
-- =====================================================

-- Insert initial privacy policy version
INSERT INTO dpa_privacy_notices (
    notice_type,
    version,
    title,
    content,
    summary,
    language,
    effective_from,
    is_current,
    is_published,
    requires_acceptance
) VALUES (
    'privacy_policy',
    '1.0.0',
    'OpsTower Privacy Policy',
    'OpsTower Privacy Policy - Full content to be added',
    'This privacy policy explains how OpsTower collects, uses, and protects your personal data in compliance with the Data Privacy Act of 2012.',
    'en',
    '2026-02-07 00:00:00+08',
    true,
    true,
    true
);

-- Insert initial terms of service
INSERT INTO dpa_privacy_notices (
    notice_type,
    version,
    title,
    content,
    summary,
    language,
    effective_from,
    is_current,
    is_published,
    requires_acceptance
) VALUES (
    'terms_of_service',
    '1.0.0',
    'OpsTower Terms of Service',
    'OpsTower Terms of Service - Full content to be added',
    'These terms govern your use of the OpsTower ridesharing platform.',
    'en',
    '2026-02-07 00:00:00+08',
    true,
    true,
    true
);

-- Insert sample processing activities
INSERT INTO dpa_processing_activities (
    activity_name,
    activity_code,
    purpose,
    legal_basis,
    data_categories,
    data_subject_categories,
    recipients,
    retention_period_days,
    retention_criteria,
    security_measures,
    is_active
) VALUES
(
    'Ride Booking and Matching',
    'PROC-001',
    'Process ride bookings and match passengers with drivers',
    'contract',
    '["name", "phone", "location", "payment_info"]',
    '["passengers", "drivers"]',
    '["mapping_services", "payment_processors"]',
    1825, -- 5 years
    'Retain for 5 years from last ride for dispute resolution and compliance',
    '["encryption_at_rest", "encryption_in_transit", "access_control", "audit_logging"]',
    true
),
(
    'Payment Processing',
    'PROC-002',
    'Process payments for rides and services',
    'contract',
    '["name", "payment_info", "transaction_history"]',
    '["passengers", "drivers"]',
    '["payment_processors", "banks"]',
    2555, -- 7 years (BIR requirement)
    'Retain for 7 years for tax compliance (BIR requirement)',
    '["pci_dss_compliance", "encryption", "tokenization", "audit_logging"]',
    true
),
(
    'Marketing Communications',
    'PROC-003',
    'Send promotional offers and marketing communications',
    'consent',
    '["name", "email", "phone", "preferences"]',
    '["passengers", "drivers"]',
    '["email_service_provider", "sms_gateway"]',
    730, -- 2 years
    'Retain for 2 years or until consent withdrawn',
    '["encryption", "access_control", "consent_tracking"]',
    true
);

-- Insert sample retention policies
INSERT INTO dpa_retention_policies (
    policy_name,
    policy_code,
    table_name,
    data_category,
    retention_period_days,
    retention_start_field,
    expiry_action,
    legal_basis,
    regulation_reference,
    is_active,
    next_execution_at
) VALUES
(
    'Ride Data Retention',
    'RET-001',
    'rides',
    'ride_data',
    1825, -- 5 years
    'created_at',
    'archive',
    'Retain for dispute resolution and LTFRB compliance',
    'LTFRB Memorandum Circular 2018-005',
    true,
    NOW() + INTERVAL '1 day'
),
(
    'Payment Transaction Retention',
    'RET-002',
    'payments',
    'transaction_data',
    2555, -- 7 years
    'created_at',
    'archive',
    'BIR tax compliance requirement',
    'BIR Revenue Regulations',
    true,
    NOW() + INTERVAL '1 day'
),
(
    'Expired Consent Cleanup',
    'RET-003',
    'dpa_consents',
    'consent_data',
    365, -- 1 year after withdrawal
    'withdrawn_at',
    'delete',
    'No longer needed after withdrawal and grace period',
    'DPA IRR Section 18',
    true,
    NOW() + INTERVAL '1 day'
);

-- =====================================================
-- MIGRATION VERIFICATION
-- =====================================================

-- Verify tables created
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_name IN (
        'dpa_consents',
        'dpa_data_requests',
        'dpa_processing_activities',
        'dpa_privacy_notices',
        'insurance_verification',
        'dpa_retention_policies'
    )
ORDER BY table_name;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MIGRATION 049: DPA Compliance System - COMPLETE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - dpa_consents (Consent tracking)';
    RAISE NOTICE '  - dpa_data_requests (Data subject rights)';
    RAISE NOTICE '  - dpa_processing_activities (ROPA)';
    RAISE NOTICE '  - dpa_privacy_notices (Policy versioning)';
    RAISE NOTICE '  - insurance_verification (Insurance compliance)';
    RAISE NOTICE '  - dpa_retention_policies (Automated retention)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Multi-type consent tracking (9 consent types)';
    RAISE NOTICE '  - Data subject rights (7 request types)';
    RAISE NOTICE '  - Record of Processing Activities (ROPA)';
    RAISE NOTICE '  - Version-controlled privacy policies';
    RAISE NOTICE '  - Insurance verification system';
    RAISE NOTICE '  - Automated data retention policies';
    RAISE NOTICE '  - 30-day deadline tracking for requests';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Implement DPA consent management service';
    RAISE NOTICE '  2. Implement data subject rights service';
    RAISE NOTICE '  3. Create DPA API endpoints';
    RAISE NOTICE '  4. Build consent management UI';
    RAISE NOTICE '  5. Configure automated retention jobs';
    RAISE NOTICE '=====================================================';
END $$;
