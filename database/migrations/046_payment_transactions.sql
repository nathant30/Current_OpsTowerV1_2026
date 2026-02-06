-- =====================================================
-- MIGRATION 046: Payment Transaction System
-- GCash & PayMaya Integration with Audit Trail
-- =====================================================
-- Author: Development Coordinator
-- Date: 2026-02-07
-- Purpose: Enable GCash payment gateway integration with comprehensive
--          audit trails, BSP compliance, and security features
-- Dependencies: Issue #14 (HTTPS), Issue #15 (Database Encryption)
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES
('046', 'Payment transaction system with GCash integration', NOW());

-- =====================================================
-- PAYMENT METHODS TABLE
-- =====================================================
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User Reference
    user_id UUID NOT NULL,
    user_type TEXT CHECK (user_type IN ('passenger', 'driver', 'operator')) NOT NULL,

    -- Payment Method Details
    method_type TEXT CHECK (method_type IN ('gcash', 'paymaya', 'card', 'cash')) NOT NULL,
    method_name VARCHAR(100) NOT NULL,

    -- Account Details (encrypted with DATABASE_ENCRYPTION_KEY)
    account_number TEXT, -- Encrypted
    phone_number VARCHAR(20),

    -- Card Details (encrypted, for future card integration)
    card_last4 VARCHAR(4),
    card_brand VARCHAR(50),
    card_expiry_date VARCHAR(7), -- MM/YYYY

    -- Verification
    verification_status TEXT CHECK (verification_status IN ('unverified', 'pending', 'verified', 'failed')) DEFAULT 'unverified',
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Status
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Indexes
    CONSTRAINT unique_default_per_user UNIQUE (user_id, user_type, is_default)
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id, user_type);
CREATE INDEX idx_payment_methods_type ON payment_methods(method_type);
CREATE INDEX idx_payment_methods_active ON payment_methods(is_active) WHERE is_active = true;

COMMENT ON TABLE payment_methods IS 'User payment methods (encrypted sensitive data)';
COMMENT ON COLUMN payment_methods.account_number IS 'Encrypted with DATABASE_ENCRYPTION_KEY (Issue #15)';

-- =====================================================
-- PAYMENTS TABLE (Main Transaction Table)
-- =====================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction Identifiers
    transaction_id VARCHAR(100) UNIQUE NOT NULL, -- Our internal ID (TXN-GCASH-{timestamp})
    reference_number VARCHAR(100) UNIQUE NOT NULL, -- External reference

    -- Payment Gateway Details
    provider TEXT CHECK (provider IN ('ebanx', 'checkout', '2c2p', 'direct')) NOT NULL,
    provider_transaction_id VARCHAR(100), -- Provider's transaction ID

    -- Amount
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'PHP' NOT NULL,

    -- Payment Method
    payment_method TEXT CHECK (payment_method IN ('gcash', 'paymaya', 'card', 'cash')) NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,

    -- User Details
    user_id UUID NOT NULL,
    user_type TEXT CHECK (user_type IN ('passenger', 'driver', 'operator')) NOT NULL,

    -- Related Entities
    booking_id UUID, -- Reference to active_rides or booking

    -- Status
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'expired')) DEFAULT 'pending',

    -- Description
    description TEXT NOT NULL,

    -- URLs (for redirect flows)
    success_url TEXT,
    failure_url TEXT,
    redirect_url TEXT, -- URL to payment gateway (EBANX callback link)

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Payment timeout (30 minutes for GCash)
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Failure Details
    failure_reason TEXT,
    failure_code VARCHAR(50),

    -- Metadata (JSON for flexibility)
    metadata JSONB DEFAULT '{}',
    -- Example: {"device": "mobile", "app_version": "1.0.0", "ip": "1.2.3.4"}

    -- Audit
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_reference_number ON payments(reference_number);
CREATE INDEX idx_payments_user ON payments(user_id, user_type);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_expires_at ON payments(expires_at) WHERE status = 'pending';

COMMENT ON TABLE payments IS 'Main payment transactions table for all payment methods';
COMMENT ON COLUMN payments.provider IS 'Payment gateway provider (ebanx for GCash)';
COMMENT ON COLUMN payments.redirect_url IS 'EBANX callback link for customer redirect';

-- =====================================================
-- TRANSACTION LOGS TABLE (Audit Trail)
-- =====================================================
CREATE TABLE transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Payment Reference
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) NOT NULL,

    -- Event Details
    event_type TEXT CHECK (event_type IN (
        'initiated', 'redirect', 'processing', 'completed',
        'failed', 'cancelled', 'refunded', 'expired',
        'webhook_received', 'status_queried', 'retry_attempted'
    )) NOT NULL,

    -- Status Transition
    previous_status TEXT,
    new_status TEXT,

    -- Details
    description TEXT,

    -- Request/Response Data (for debugging)
    request_data JSONB,
    response_data JSONB,

    -- Error Details
    error_message TEXT,
    error_code VARCHAR(50),

    -- Source
    source TEXT CHECK (source IN ('api', 'webhook', 'manual', 'system', 'retry')) NOT NULL,
    source_ip VARCHAR(45), -- IPv6 support

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Audit
    created_by UUID
);

CREATE INDEX idx_transaction_logs_payment ON transaction_logs(payment_id);
CREATE INDEX idx_transaction_logs_transaction ON transaction_logs(transaction_id);
CREATE INDEX idx_transaction_logs_event ON transaction_logs(event_type);
CREATE INDEX idx_transaction_logs_created_at ON transaction_logs(created_at DESC);
CREATE INDEX idx_transaction_logs_source ON transaction_logs(source);

COMMENT ON TABLE transaction_logs IS 'Comprehensive audit trail for all payment events (BSP compliance)';

-- =====================================================
-- WEBHOOK EVENTS TABLE (Webhook Audit)
-- =====================================================
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Payment Reference
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    transaction_id VARCHAR(100),

    -- Webhook Details
    provider TEXT CHECK (provider IN ('ebanx', 'checkout', '2c2p')) NOT NULL,
    event_type VARCHAR(100) NOT NULL,

    -- Payload
    payload JSONB NOT NULL,
    headers JSONB,

    -- Signature Verification
    signature VARCHAR(500),
    signature_verified BOOLEAN DEFAULT false,

    -- Processing Status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_attempts INTEGER DEFAULT 0,

    -- Error Handling
    error_message TEXT,

    -- Source
    source_ip VARCHAR(45),

    -- Timestamp
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Retry
    retry_scheduled_at TIMESTAMP WITH TIME ZONE,
    last_retry_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_webhook_events_payment ON webhook_events(payment_id);
CREATE INDEX idx_webhook_events_transaction ON webhook_events(transaction_id);
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed, received_at);
CREATE INDEX idx_webhook_events_retry ON webhook_events(retry_scheduled_at) WHERE NOT processed;
CREATE INDEX idx_webhook_events_signature ON webhook_events(signature_verified);

COMMENT ON TABLE webhook_events IS 'Webhook event log with retry mechanism (requires HTTPS - Issue #14)';

-- =====================================================
-- REFUNDS TABLE
-- =====================================================
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Refund Identifiers
    refund_id VARCHAR(100) UNIQUE NOT NULL,

    -- Payment Reference
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) NOT NULL,

    -- Provider Details
    provider TEXT CHECK (provider IN ('ebanx', 'checkout', '2c2p', 'manual')) NOT NULL,
    provider_refund_id VARCHAR(100),

    -- Amount
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'PHP' NOT NULL,

    -- Refund Type
    refund_type TEXT CHECK (refund_type IN ('full', 'partial')) NOT NULL,

    -- Status
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'failed')) DEFAULT 'pending',

    -- Reason
    reason TEXT NOT NULL,
    rejection_reason TEXT,

    -- Approval Workflow
    requested_by UUID NOT NULL,
    approved_by UUID,
    processed_by UUID,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_transaction ON refunds(transaction_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_requested_by ON refunds(requested_by);
CREATE INDEX idx_refunds_created_at ON refunds(created_at DESC);

COMMENT ON TABLE refunds IS 'Refund requests and processing (supports partial/full refunds)';

-- =====================================================
-- RECONCILIATION TABLE (Daily Settlement)
-- =====================================================
CREATE TABLE payment_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reconciliation Period
    reconciliation_date DATE NOT NULL,
    provider TEXT CHECK (provider IN ('ebanx', 'checkout', '2c2p')) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('gcash', 'paymaya', 'card', 'cash')) NOT NULL,

    -- Transaction Summary
    total_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,

    -- Expected vs Actual
    expected_amount DECIMAL(12,2) DEFAULT 0.00,
    actual_amount DECIMAL(12,2) DEFAULT 0.00,
    difference DECIMAL(12,2) DEFAULT 0.00,

    -- Status
    status TEXT CHECK (status IN ('pending', 'reconciled', 'discrepancy', 'resolved')) DEFAULT 'pending',

    -- Resolution
    notes TEXT,
    reconciled_by UUID,
    reconciled_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    CONSTRAINT unique_daily_reconciliation UNIQUE (reconciliation_date, provider, payment_method)
);

CREATE INDEX idx_reconciliation_date ON payment_reconciliation(reconciliation_date DESC);
CREATE INDEX idx_reconciliation_status ON payment_reconciliation(status);
CREATE INDEX idx_reconciliation_provider ON payment_reconciliation(provider);

COMMENT ON TABLE payment_reconciliation IS 'Daily reconciliation for financial reporting (BSP compliance)';

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_reconciliation_updated_at
    BEFORE UPDATE ON payment_reconciliation
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

-- =====================================================
-- SECURITY & COMPLIANCE
-- =====================================================

-- Row-level security (enable for multi-tenant isolation)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliation ENABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust based on your role structure)
-- Uncomment and adjust these based on your database roles
-- GRANT SELECT, INSERT, UPDATE ON payments TO xpress_writer;
-- GRANT SELECT ON payments TO xpress_reader;
-- GRANT SELECT, INSERT, UPDATE ON payment_methods TO xpress_writer;
-- GRANT SELECT ON payment_methods TO xpress_reader;
-- GRANT SELECT, INSERT ON transaction_logs TO xpress_writer;
-- GRANT SELECT ON transaction_logs TO xpress_reader;

-- =====================================================
-- INDEXES FOR REPORTING & ANALYTICS
-- =====================================================

-- Payment analytics
CREATE INDEX idx_payments_analytics ON payments(
    status, payment_method, created_at DESC
) WHERE status IN ('completed', 'refunded');

-- Financial reporting
CREATE INDEX idx_payments_financial ON payments(
    created_at, status, amount
) WHERE status = 'completed';

-- Webhook monitoring
CREATE INDEX idx_webhook_monitoring ON webhook_events(
    received_at DESC, processed, provider
);

-- Failed payments analysis
CREATE INDEX idx_payments_failed ON payments(
    status, payment_method, created_at DESC
) WHERE status = 'failed';

-- =====================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =====================================================

-- Daily payment summary (for dashboards)
CREATE MATERIALIZED VIEW daily_payment_summary AS
SELECT
    DATE(created_at) as payment_date,
    payment_method,
    provider,
    status,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM payments
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), payment_method, provider, status;

CREATE INDEX idx_daily_summary ON daily_payment_summary(payment_date DESC);
CREATE INDEX idx_daily_summary_method ON daily_payment_summary(payment_method, payment_date DESC);

-- Hourly payment summary (for real-time monitoring)
CREATE MATERIALIZED VIEW hourly_payment_summary AS
SELECT
    DATE_TRUNC('hour', created_at) as payment_hour,
    payment_method,
    provider,
    status,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM payments
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), payment_method, provider, status;

CREATE INDEX idx_hourly_summary ON hourly_payment_summary(payment_hour DESC);

-- Refresh schedule (add to cron job):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY daily_payment_summary;  -- Daily at midnight
-- REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_payment_summary; -- Every hour

-- =====================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL - REMOVE IN PRODUCTION)
-- =====================================================

-- Uncomment for development/testing environments only
/*
-- Sample payment method
INSERT INTO payment_methods (user_id, user_type, method_type, method_name, phone_number, verification_status, is_default)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'passenger', 'gcash', 'GCash Account', '+639171234567', 'verified', true);

-- Sample payment transaction
INSERT INTO payments (
    transaction_id, reference_number, provider, amount, currency,
    payment_method, user_id, user_type, description, status,
    success_url, failure_url
) VALUES (
    'TXN-GCASH-TEST-001',
    'REF-TEST-001',
    'ebanx',
    250.00,
    'PHP',
    'gcash',
    '00000000-0000-0000-0000-000000000001',
    'passenger',
    'Ride payment - Test Ride #001',
    'pending',
    'https://opstower.com/payments/success',
    'https://opstower.com/payments/failed'
);
*/

-- =====================================================
-- MIGRATION VERIFICATION
-- =====================================================

-- Verify tables created
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = t.table_name) as constraint_count
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_name IN (
        'payment_methods',
        'payments',
        'transaction_logs',
        'webhook_events',
        'refunds',
        'payment_reconciliation'
    )
ORDER BY table_name;

-- Verify indexes created
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'payment_methods',
        'payments',
        'transaction_logs',
        'webhook_events',
        'refunds',
        'payment_reconciliation'
    )
ORDER BY tablename, indexname;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log completion
INSERT INTO transaction_logs (
    transaction_id,
    event_type,
    description,
    source
) VALUES (
    'MIGRATION-046',
    'initiated',
    'Payment transaction system migration completed successfully',
    'system'
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MIGRATION 046: Payment Transaction System - COMPLETE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - payment_methods';
    RAISE NOTICE '  - payments';
    RAISE NOTICE '  - transaction_logs';
    RAISE NOTICE '  - webhook_events';
    RAISE NOTICE '  - refunds';
    RAISE NOTICE '  - payment_reconciliation';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - GCash/PayMaya integration ready';
    RAISE NOTICE '  - Comprehensive audit trail';
    RAISE NOTICE '  - Webhook handling with retries';
    RAISE NOTICE '  - BSP compliance reporting';
    RAISE NOTICE '  - Row-level security enabled';
    RAISE NOTICE '  - Performance indexes and materialized views';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Complete Issue #14 (HTTPS/SSL)';
    RAISE NOTICE '  2. Complete Issue #15 (Database Encryption)';
    RAISE NOTICE '  3. Configure GCASH_* environment variables';
    RAISE NOTICE '  4. Implement GCash API client';
    RAISE NOTICE '  5. Test with EBANX sandbox';
    RAISE NOTICE '=====================================================';
END $$;
