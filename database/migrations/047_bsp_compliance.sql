-- =====================================================
-- MIGRATION 047: BSP Compliance Reporting System
-- Bangko Sentral ng Pilipinas (Central Bank) Compliance
-- =====================================================
-- Author: Development Coordinator
-- Date: 2026-02-07
-- Purpose: Enable BSP compliance reporting with AML monitoring,
--          suspicious activity detection, and automated reporting
-- Dependencies: Migration 046 (Payment Transactions)
-- Related Issues: #21 (BSP Compliance Reporting)
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES
('047', 'BSP compliance reporting system with AML monitoring', NOW());

-- =====================================================
-- 1. AML TRANSACTION MONITORING TABLE
-- =====================================================
-- Track high-value transactions for AML compliance (₱50,000 threshold)
CREATE TABLE bsp_aml_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction Reference
    transaction_id VARCHAR(100) NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,

    -- Transaction Details
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PHP' NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('ride_payment', 'wallet_topup', 'refund', 'withdrawal')) NOT NULL,

    -- User Details
    user_id UUID NOT NULL,
    user_type TEXT CHECK (user_type IN ('passenger', 'driver', 'operator')) NOT NULL,
    user_name VARCHAR(200),
    user_phone VARCHAR(20),
    user_email VARCHAR(200),

    -- AML Threshold Checks
    exceeds_single_threshold BOOLEAN DEFAULT false, -- ₱50,000 per transaction
    exceeds_daily_threshold BOOLEAN DEFAULT false, -- ₱100,000 per day
    exceeds_monthly_threshold BOOLEAN DEFAULT false, -- ₱500,000 per month

    daily_cumulative_amount DECIMAL(12,2) DEFAULT 0,
    monthly_cumulative_amount DECIMAL(12,2) DEFAULT 0,

    -- Risk Assessment
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100) DEFAULT 0,
    risk_factors JSONB DEFAULT '[]',
    -- Example: ["high_amount", "unusual_time", "new_account", "frequent_transactions"]

    -- Flags
    flagged_for_review BOOLEAN DEFAULT false,
    reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- BSP Reporting
    reported_to_bsp BOOLEAN DEFAULT false,
    bsp_report_id VARCHAR(100),
    reported_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_aml_monitoring_transaction ON bsp_aml_monitoring(transaction_id);
CREATE INDEX idx_aml_monitoring_payment ON bsp_aml_monitoring(payment_id);
CREATE INDEX idx_aml_monitoring_user ON bsp_aml_monitoring(user_id, user_type);
CREATE INDEX idx_aml_monitoring_amount ON bsp_aml_monitoring(amount DESC);
CREATE INDEX idx_aml_monitoring_flagged ON bsp_aml_monitoring(flagged_for_review, reviewed);
CREATE INDEX idx_aml_monitoring_threshold ON bsp_aml_monitoring(exceeds_single_threshold, transaction_date);
CREATE INDEX idx_aml_monitoring_date ON bsp_aml_monitoring(transaction_date DESC);
CREATE INDEX idx_aml_monitoring_risk ON bsp_aml_monitoring(risk_level, transaction_date);

COMMENT ON TABLE bsp_aml_monitoring IS 'AML transaction monitoring for BSP compliance (₱50,000 threshold)';

-- =====================================================
-- 2. SUSPICIOUS ACTIVITY LOGS TABLE
-- =====================================================
-- Track suspicious patterns and activities
CREATE TABLE bsp_suspicious_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Activity Details
    activity_type TEXT CHECK (activity_type IN (
        'structuring', -- Breaking up transactions to avoid threshold
        'rapid_succession', -- Multiple transactions in short time
        'unusual_pattern', -- Deviation from normal behavior
        'high_velocity', -- High transaction frequency
        'round_amounts', -- Suspicious round numbers
        'new_account_large', -- Large transaction on new account
        'geographic_anomaly', -- Unusual location
        'time_anomaly', -- Unusual time of day
        'manual_flag' -- Manually flagged by compliance officer
    )) NOT NULL,

    -- User Reference
    user_id UUID NOT NULL,
    user_type TEXT CHECK (user_type IN ('passenger', 'driver', 'operator')) NOT NULL,
    user_name VARCHAR(200),

    -- Related Transactions
    related_transactions JSONB DEFAULT '[]',
    -- Example: [{"transaction_id": "TXN-123", "amount": 49000, "timestamp": "2026-02-07T10:00:00Z"}]

    -- Detection Details
    detection_method TEXT CHECK (detection_method IN ('automated', 'manual', 'ai_model')) NOT NULL,
    pattern_description TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,

    -- Evidence
    evidence JSONB DEFAULT '{}',
    -- Example: {"transaction_count": 5, "total_amount": 245000, "time_span_minutes": 30}

    -- Status
    status TEXT CHECK (status IN ('detected', 'under_review', 'escalated', 'cleared', 'reported')) DEFAULT 'detected',

    -- Investigation
    assigned_to UUID,
    investigation_notes TEXT,
    false_positive BOOLEAN DEFAULT false,

    -- BSP Reporting
    reported_to_bsp BOOLEAN DEFAULT false,
    bsp_sar_id VARCHAR(100), -- Suspicious Activity Report ID
    reported_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suspicious_activity_user ON bsp_suspicious_activity(user_id, user_type);
CREATE INDEX idx_suspicious_activity_type ON bsp_suspicious_activity(activity_type, detected_at);
CREATE INDEX idx_suspicious_activity_status ON bsp_suspicious_activity(status);
CREATE INDEX idx_suspicious_activity_severity ON bsp_suspicious_activity(severity, status);
CREATE INDEX idx_suspicious_activity_detected ON bsp_suspicious_activity(detected_at DESC);

COMMENT ON TABLE bsp_suspicious_activity IS 'Suspicious activity detection for BSP SAR (Suspicious Activity Reports)';

-- =====================================================
-- 3. BSP REPORT SUBMISSIONS TABLE
-- =====================================================
-- Track all BSP report submissions
CREATE TABLE bsp_report_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Report Identification
    report_id VARCHAR(100) UNIQUE NOT NULL,
    report_type TEXT CHECK (report_type IN (
        'daily_transactions',
        'monthly_reconciliation',
        'suspicious_activity',
        'aml_threshold_breach',
        'quarterly_summary',
        'annual_summary'
    )) NOT NULL,

    -- Report Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    reporting_year INTEGER NOT NULL,
    reporting_month INTEGER CHECK (reporting_month >= 1 AND reporting_month <= 12),

    -- Report Content Summary
    total_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    flagged_transactions INTEGER DEFAULT 0,
    suspicious_activities INTEGER DEFAULT 0,

    -- File Details
    file_path VARCHAR(500),
    file_format TEXT CHECK (file_format IN ('csv', 'pdf', 'xml', 'json')) DEFAULT 'csv',
    file_size_bytes BIGINT,
    file_hash VARCHAR(64), -- SHA-256 hash for integrity

    -- Submission Status
    status TEXT CHECK (status IN (
        'draft',
        'generated',
        'submitted',
        'acknowledged',
        'rejected',
        'resubmitted'
    )) DEFAULT 'draft',

    -- BSP Tracking
    bsp_reference_number VARCHAR(100),
    bsp_acknowledgment_date TIMESTAMP WITH TIME ZONE,
    bsp_notes TEXT,

    -- Metadata
    generated_by UUID NOT NULL,
    submitted_by UUID,
    approved_by UUID,

    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bsp_reports_type ON bsp_report_submissions(report_type, period_start);
CREATE INDEX idx_bsp_reports_status ON bsp_report_submissions(status);
CREATE INDEX idx_bsp_reports_period ON bsp_report_submissions(period_start DESC, period_end DESC);
CREATE INDEX idx_bsp_reports_submitted ON bsp_report_submissions(submitted_at DESC);

COMMENT ON TABLE bsp_report_submissions IS 'BSP report submissions tracking with acknowledgment status';

-- =====================================================
-- 4. BSP COMPLIANCE ALERTS TABLE
-- =====================================================
-- Alert system for threshold breaches and compliance issues
CREATE TABLE bsp_compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Alert Details
    alert_type TEXT CHECK (alert_type IN (
        'threshold_breach',
        'suspicious_pattern',
        'missing_report',
        'system_error',
        'manual_review_required'
    )) NOT NULL,
    severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')) NOT NULL,

    -- Alert Message
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- Related Entities
    transaction_id VARCHAR(100),
    user_id UUID,
    report_id VARCHAR(100),

    -- Alert Data
    alert_data JSONB DEFAULT '{}',
    -- Example: {"threshold": 50000, "actual_amount": 75000, "excess": 25000}

    -- Status
    status TEXT CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')) DEFAULT 'active',

    -- Response
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,

    -- Notifications
    notification_sent BOOLEAN DEFAULT false,
    notification_channels JSONB DEFAULT '[]',
    -- Example: ["email", "sms", "dashboard"]

    -- Timestamps
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bsp_alerts_type ON bsp_compliance_alerts(alert_type, triggered_at);
CREATE INDEX idx_bsp_alerts_severity ON bsp_compliance_alerts(severity, status);
CREATE INDEX idx_bsp_alerts_status ON bsp_compliance_alerts(status, triggered_at);
CREATE INDEX idx_bsp_alerts_user ON bsp_compliance_alerts(user_id);
CREATE INDEX idx_bsp_alerts_transaction ON bsp_compliance_alerts(transaction_id);

COMMENT ON TABLE bsp_compliance_alerts IS 'Real-time compliance alerts for BSP monitoring';

-- =====================================================
-- 5. DAILY TRANSACTION SUMMARY (FOR BSP REPORTING)
-- =====================================================
-- Pre-aggregated daily transaction data for efficient reporting
CREATE TABLE bsp_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Summary Date
    summary_date DATE NOT NULL,

    -- Transaction Counts
    total_transactions INTEGER DEFAULT 0,
    completed_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    refunded_transactions INTEGER DEFAULT 0,

    -- Amount Aggregates
    total_amount DECIMAL(15,2) DEFAULT 0,
    total_completed DECIMAL(15,2) DEFAULT 0,
    total_refunded DECIMAL(15,2) DEFAULT 0,
    average_transaction DECIMAL(10,2) DEFAULT 0,

    -- Payment Method Breakdown
    gcash_count INTEGER DEFAULT 0,
    gcash_amount DECIMAL(12,2) DEFAULT 0,
    maya_count INTEGER DEFAULT 0,
    maya_amount DECIMAL(12,2) DEFAULT 0,
    cash_count INTEGER DEFAULT 0,
    cash_amount DECIMAL(12,2) DEFAULT 0,

    -- AML Monitoring
    high_value_count INTEGER DEFAULT 0, -- Transactions > ₱50,000
    high_value_amount DECIMAL(15,2) DEFAULT 0,
    flagged_count INTEGER DEFAULT 0,
    suspicious_count INTEGER DEFAULT 0,

    -- Report Generation
    report_generated BOOLEAN DEFAULT false,
    report_id VARCHAR(100),
    generated_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    CONSTRAINT unique_daily_summary UNIQUE (summary_date)
);

CREATE INDEX idx_bsp_daily_summary_date ON bsp_daily_summary(summary_date DESC);
CREATE INDEX idx_bsp_daily_summary_report ON bsp_daily_summary(report_generated, summary_date);

COMMENT ON TABLE bsp_daily_summary IS 'Pre-aggregated daily transaction summary for BSP reporting';

-- =====================================================
-- 6. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update AML cumulative amounts
CREATE OR REPLACE FUNCTION update_aml_cumulative_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate daily cumulative
    NEW.daily_cumulative_amount := (
        SELECT COALESCE(SUM(amount), 0) + NEW.amount
        FROM bsp_aml_monitoring
        WHERE user_id = NEW.user_id
        AND DATE(transaction_date) = DATE(NEW.transaction_date)
        AND id != NEW.id
    );

    -- Calculate monthly cumulative
    NEW.monthly_cumulative_amount := (
        SELECT COALESCE(SUM(amount), 0) + NEW.amount
        FROM bsp_aml_monitoring
        WHERE user_id = NEW.user_id
        AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NEW.transaction_date)
        AND id != NEW.id
    );

    -- Check thresholds
    NEW.exceeds_single_threshold := NEW.amount >= 50000;
    NEW.exceeds_daily_threshold := NEW.daily_cumulative_amount >= 100000;
    NEW.exceeds_monthly_threshold := NEW.monthly_cumulative_amount >= 500000;

    -- Auto-flag if any threshold exceeded
    IF NEW.exceeds_single_threshold OR NEW.exceeds_daily_threshold OR NEW.exceeds_monthly_threshold THEN
        NEW.flagged_for_review := true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_aml_cumulative_amounts
    BEFORE INSERT OR UPDATE ON bsp_aml_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION update_aml_cumulative_amounts();

-- Function to auto-generate compliance alert on threshold breach
CREATE OR REPLACE FUNCTION create_threshold_breach_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.exceeds_single_threshold = true AND (OLD IS NULL OR OLD.exceeds_single_threshold = false) THEN
        INSERT INTO bsp_compliance_alerts (
            alert_type,
            severity,
            title,
            description,
            transaction_id,
            user_id,
            alert_data
        ) VALUES (
            'threshold_breach',
            'warning',
            'AML Threshold Breach Detected',
            format('Transaction %s exceeded single transaction threshold (₱50,000): ₱%s', NEW.transaction_id, NEW.amount),
            NEW.transaction_id,
            NEW.user_id,
            jsonb_build_object(
                'threshold', 50000,
                'actual_amount', NEW.amount,
                'excess', NEW.amount - 50000,
                'threshold_type', 'single_transaction'
            )
        );
    END IF;

    IF NEW.exceeds_daily_threshold = true AND (OLD IS NULL OR OLD.exceeds_daily_threshold = false) THEN
        INSERT INTO bsp_compliance_alerts (
            alert_type,
            severity,
            title,
            description,
            user_id,
            alert_data
        ) VALUES (
            'threshold_breach',
            'error',
            'Daily AML Threshold Breach',
            format('User %s exceeded daily cumulative threshold (₱100,000): ₱%s', NEW.user_id, NEW.daily_cumulative_amount),
            NEW.user_id,
            jsonb_build_object(
                'threshold', 100000,
                'actual_amount', NEW.daily_cumulative_amount,
                'excess', NEW.daily_cumulative_amount - 100000,
                'threshold_type', 'daily_cumulative'
            )
        );
    END IF;

    IF NEW.exceeds_monthly_threshold = true AND (OLD IS NULL OR OLD.exceeds_monthly_threshold = false) THEN
        INSERT INTO bsp_compliance_alerts (
            alert_type,
            severity,
            title,
            description,
            user_id,
            alert_data
        ) VALUES (
            'threshold_breach',
            'critical',
            'Monthly AML Threshold Breach',
            format('User %s exceeded monthly cumulative threshold (₱500,000): ₱%s', NEW.user_id, NEW.monthly_cumulative_amount),
            NEW.user_id,
            jsonb_build_object(
                'threshold', 500000,
                'actual_amount', NEW.monthly_cumulative_amount,
                'excess', NEW.monthly_cumulative_amount - 500000,
                'threshold_type', 'monthly_cumulative'
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_threshold_breach_alert
    AFTER INSERT OR UPDATE ON bsp_aml_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION create_threshold_breach_alert();

-- Update updated_at timestamp triggers
CREATE TRIGGER trigger_aml_monitoring_updated_at
    BEFORE UPDATE ON bsp_aml_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_suspicious_activity_updated_at
    BEFORE UPDATE ON bsp_suspicious_activity
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_bsp_reports_updated_at
    BEFORE UPDATE ON bsp_report_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_bsp_alerts_updated_at
    BEFORE UPDATE ON bsp_compliance_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_bsp_daily_summary_updated_at
    BEFORE UPDATE ON bsp_daily_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

-- =====================================================
-- 7. MATERIALIZED VIEWS FOR REPORTING
-- =====================================================

-- AML Monitoring Dashboard View
CREATE MATERIALIZED VIEW bsp_aml_dashboard AS
SELECT
    DATE(transaction_date) as monitoring_date,
    COUNT(*) as total_monitored,
    COUNT(*) FILTER (WHERE exceeds_single_threshold) as single_threshold_breaches,
    COUNT(*) FILTER (WHERE exceeds_daily_threshold) as daily_threshold_breaches,
    COUNT(*) FILTER (WHERE exceeds_monthly_threshold) as monthly_threshold_breaches,
    COUNT(*) FILTER (WHERE flagged_for_review) as flagged_count,
    COUNT(*) FILTER (WHERE reviewed) as reviewed_count,
    COUNT(*) FILTER (WHERE reported_to_bsp) as reported_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    MAX(amount) as max_amount,
    COUNT(DISTINCT user_id) as unique_users
FROM bsp_aml_monitoring
WHERE transaction_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(transaction_date)
ORDER BY monitoring_date DESC;

CREATE INDEX idx_bsp_aml_dashboard_date ON bsp_aml_dashboard(monitoring_date DESC);

-- Suspicious Activity Summary View
CREATE MATERIALIZED VIEW bsp_suspicious_summary AS
SELECT
    activity_type,
    severity,
    status,
    COUNT(*) as activity_count,
    COUNT(*) FILTER (WHERE reported_to_bsp) as reported_count,
    COUNT(*) FILTER (WHERE false_positive) as false_positive_count,
    MIN(detected_at) as first_detected,
    MAX(detected_at) as last_detected
FROM bsp_suspicious_activity
WHERE detected_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY activity_type, severity, status
ORDER BY activity_count DESC;

-- Monthly Reconciliation View
CREATE MATERIALIZED VIEW bsp_monthly_reconciliation AS
SELECT
    DATE_TRUNC('month', transaction_date)::DATE as reconciliation_month,
    COUNT(*) as total_transactions,
    SUM(amount) as total_amount,
    COUNT(*) FILTER (WHERE exceeds_single_threshold) as high_value_count,
    SUM(amount) FILTER (WHERE exceeds_single_threshold) as high_value_amount,
    COUNT(*) FILTER (WHERE flagged_for_review) as flagged_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(amount) as average_transaction
FROM bsp_aml_monitoring
WHERE transaction_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', transaction_date)
ORDER BY reconciliation_month DESC;

CREATE INDEX idx_bsp_monthly_reconciliation ON bsp_monthly_reconciliation(reconciliation_month DESC);

-- Refresh schedule (add to cron job):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY bsp_aml_dashboard;  -- Daily at midnight
-- REFRESH MATERIALIZED VIEW CONCURRENTLY bsp_suspicious_summary;  -- Daily
-- REFRESH MATERIALIZED VIEW CONCURRENTLY bsp_monthly_reconciliation;  -- Monthly

-- =====================================================
-- 8. ROW-LEVEL SECURITY
-- =====================================================

ALTER TABLE bsp_aml_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsp_suspicious_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsp_report_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsp_compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsp_daily_summary ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. SAMPLE QUERY FUNCTIONS FOR BSP REPORTS
-- =====================================================

-- Function to generate daily transaction report data
CREATE OR REPLACE FUNCTION bsp_get_daily_report(report_date DATE)
RETURNS TABLE (
    transaction_id VARCHAR(100),
    transaction_time TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    amount DECIMAL(12,2),
    payment_method TEXT,
    status TEXT,
    flagged BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.transaction_id,
        p.created_at,
        p.user_id,
        p.amount,
        p.payment_method,
        p.status,
        COALESCE(aml.flagged_for_review, false) as flagged
    FROM payments p
    LEFT JOIN bsp_aml_monitoring aml ON p.transaction_id = aml.transaction_id
    WHERE DATE(p.created_at) = report_date
    ORDER BY p.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly reconciliation summary
CREATE OR REPLACE FUNCTION bsp_get_monthly_summary(reporting_month DATE)
RETURNS TABLE (
    total_transactions BIGINT,
    total_amount NUMERIC,
    high_value_count BIGINT,
    high_value_amount NUMERIC,
    flagged_count BIGINT,
    suspicious_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(aml.amount), 0) as total_amount,
        COUNT(*) FILTER (WHERE aml.exceeds_single_threshold) as high_value_count,
        COALESCE(SUM(aml.amount) FILTER (WHERE aml.exceeds_single_threshold), 0) as high_value_amount,
        COUNT(*) FILTER (WHERE aml.flagged_for_review) as flagged_count,
        (SELECT COUNT(*) FROM bsp_suspicious_activity
         WHERE DATE_TRUNC('month', detected_at) = DATE_TRUNC('month', reporting_month)) as suspicious_count
    FROM bsp_aml_monitoring aml
    WHERE DATE_TRUNC('month', aml.transaction_date) = DATE_TRUNC('month', reporting_month);
END;
$$ LANGUAGE plpgsql;

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
        'bsp_aml_monitoring',
        'bsp_suspicious_activity',
        'bsp_report_submissions',
        'bsp_compliance_alerts',
        'bsp_daily_summary'
    )
ORDER BY table_name;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MIGRATION 047: BSP Compliance Reporting - COMPLETE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - bsp_aml_monitoring (AML threshold monitoring)';
    RAISE NOTICE '  - bsp_suspicious_activity (Suspicious pattern detection)';
    RAISE NOTICE '  - bsp_report_submissions (Report tracking)';
    RAISE NOTICE '  - bsp_compliance_alerts (Alert system)';
    RAISE NOTICE '  - bsp_daily_summary (Pre-aggregated reports)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - AML threshold monitoring (₱50,000 single, ₱100,000 daily, ₱500,000 monthly)';
    RAISE NOTICE '  - Automated suspicious activity detection';
    RAISE NOTICE '  - Daily and monthly BSP reports';
    RAISE NOTICE '  - Real-time compliance alerts';
    RAISE NOTICE '  - Cumulative amount tracking';
    RAISE NOTICE '  - Materialized views for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Implement BSP compliance service layer';
    RAISE NOTICE '  2. Create report generation API endpoints';
    RAISE NOTICE '  3. Build compliance dashboard UI';
    RAISE NOTICE '  4. Configure automated daily report generation';
    RAISE NOTICE '  5. Test AML threshold detection';
    RAISE NOTICE '=====================================================';
END $$;
