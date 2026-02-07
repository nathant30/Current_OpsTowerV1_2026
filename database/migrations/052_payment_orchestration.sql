-- =====================================================
-- Migration 052: Payment Orchestration & Preferences
-- =====================================================
-- Purpose: Add tables for unified payment orchestration
-- Created: 2026-02-07
-- Author: Development Coordinator
-- Related: Issue #3 - Philippines Payment Integration
-- =====================================================

-- User Payment Preferences
-- Stores default payment method per user
CREATE TABLE IF NOT EXISTS user_payment_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  default_payment_method VARCHAR(20) NOT NULL CHECK (default_payment_method IN ('maya', 'gcash', 'cash')),
  payment_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_preference UNIQUE (user_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_payment_preferences_user_id ON user_payment_preferences(user_id);
CREATE INDEX idx_user_payment_preferences_default_method ON user_payment_preferences(default_payment_method);

-- Payment Orchestration Logs
-- Tracks payment routing decisions and orchestration events
CREATE TABLE IF NOT EXISTS payment_orchestration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('maya', 'gcash', 'cash')),
  amount DECIMAL(12, 2),
  fees JSONB,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_payment FOREIGN KEY (transaction_id) REFERENCES payments(transaction_id) ON DELETE CASCADE
);

-- Add indexes for querying
CREATE INDEX idx_payment_orchestration_logs_transaction_id ON payment_orchestration_logs(transaction_id);
CREATE INDEX idx_payment_orchestration_logs_provider ON payment_orchestration_logs(provider);
CREATE INDEX idx_payment_orchestration_logs_created_at ON payment_orchestration_logs(created_at DESC);
CREATE INDEX idx_payment_orchestration_logs_action ON payment_orchestration_logs(action);

-- Payment Method Availability
-- Tracks payment method availability and performance
CREATE TABLE IF NOT EXISTS payment_method_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('maya', 'gcash', 'cash')),
  available BOOLEAN NOT NULL DEFAULT true,
  reason VARCHAR(255),
  success_rate DECIMAL(5, 2) DEFAULT 100.00,
  average_response_time_ms INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_provider_availability UNIQUE (provider)
);

-- Initialize with default providers
INSERT INTO payment_method_availability (provider, available, success_rate) VALUES
  ('maya', true, 100.00),
  ('gcash', true, 100.00),
  ('cash', true, 100.00)
ON CONFLICT (provider) DO NOTHING;

-- Add indexes
CREATE INDEX idx_payment_method_availability_provider ON payment_method_availability(provider);
CREATE INDEX idx_payment_method_availability_available ON payment_method_availability(available);

-- Payment Fee Configuration
-- Stores fee structure for each payment method
CREATE TABLE IF NOT EXISTS payment_fee_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('maya', 'gcash', 'cash')),
  fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('percentage', 'fixed', 'combined')),
  percentage_fee DECIMAL(5, 2) DEFAULT 0.00,
  fixed_fee DECIMAL(12, 2) DEFAULT 0.00,
  minimum_fee DECIMAL(12, 2) DEFAULT 0.00,
  maximum_fee DECIMAL(12, 2),
  platform_fee DECIMAL(12, 2) DEFAULT 0.00,
  active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize default fee structure
INSERT INTO payment_fee_configuration (provider, fee_type, percentage_fee, fixed_fee, active) VALUES
  ('maya', 'combined', 2.50, 15.00, true),
  ('gcash', 'combined', 3.50, 10.00, true),
  ('cash', 'fixed', 0.00, 0.00, true)
ON CONFLICT DO NOTHING;

-- Add indexes
CREATE INDEX idx_payment_fee_configuration_provider ON payment_fee_configuration(provider);
CREATE INDEX idx_payment_fee_configuration_active ON payment_fee_configuration(active);
CREATE INDEX idx_payment_fee_configuration_effective FROM ON payment_fee_configuration(effective_from);

-- =====================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =====================================================

-- Payment Analytics by Provider
CREATE MATERIALIZED VIEW IF NOT EXISTS payment_analytics_by_provider AS
SELECT
  COALESCE(payment_method, 'unknown') as provider,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_transactions,
  COUNT(CASE WHEN status IN ('failed', 'expired', 'cancelled') THEN 1 END) as failed_transactions,
  SUM(amount::numeric) as total_amount,
  SUM(CASE WHEN status = 'completed' THEN amount::numeric ELSE 0 END) as successful_amount,
  AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, updated_at) - created_at))) as avg_processing_time_seconds,
  MIN(amount::numeric) as min_amount,
  MAX(amount::numeric) as max_amount,
  AVG(amount::numeric) as avg_amount
FROM payments
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY provider, DATE_TRUNC('day', created_at);

-- Add index for faster queries
CREATE INDEX idx_payment_analytics_by_provider_date ON payment_analytics_by_provider(date DESC);
CREATE INDEX idx_payment_analytics_by_provider_provider ON payment_analytics_by_provider(provider);

-- Payment Failure Analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS payment_failure_analysis AS
SELECT
  COALESCE(payment_method, 'unknown') as provider,
  COALESCE(failure_reason, 'unknown') as failure_reason,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as failure_count,
  SUM(amount::numeric) as failed_amount,
  AVG(amount::numeric) as avg_failed_amount
FROM payments
WHERE status IN ('failed', 'expired', 'cancelled')
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY provider, failure_reason, DATE_TRUNC('day', created_at);

-- Add indexes
CREATE INDEX idx_payment_failure_analysis_provider ON payment_failure_analysis(provider);
CREATE INDEX idx_payment_failure_analysis_date ON payment_failure_analysis(date DESC);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update payment method availability
CREATE OR REPLACE FUNCTION update_payment_method_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Update availability stats when payment completes or fails
  IF NEW.status IN ('completed', 'failed', 'expired', 'cancelled') THEN
    INSERT INTO payment_method_availability (
      provider,
      available,
      total_transactions,
      failed_transactions,
      last_success_at,
      last_failure_at,
      checked_at
    )
    VALUES (
      COALESCE(NEW.payment_method, 'unknown'),
      true,
      1,
      CASE WHEN NEW.status = 'completed' THEN 0 ELSE 1 END,
      CASE WHEN NEW.status = 'completed' THEN NOW() ELSE NULL END,
      CASE WHEN NEW.status IN ('failed', 'expired', 'cancelled') THEN NOW() ELSE NULL END,
      NOW()
    )
    ON CONFLICT (provider)
    DO UPDATE SET
      total_transactions = payment_method_availability.total_transactions + 1,
      failed_transactions = payment_method_availability.failed_transactions +
        CASE WHEN NEW.status = 'completed' THEN 0 ELSE 1 END,
      last_success_at = CASE WHEN NEW.status = 'completed' THEN NOW() ELSE payment_method_availability.last_success_at END,
      last_failure_at = CASE WHEN NEW.status IN ('failed', 'expired', 'cancelled') THEN NOW() ELSE payment_method_availability.last_failure_at END,
      success_rate = CASE
        WHEN payment_method_availability.total_transactions + 1 > 0
        THEN ((payment_method_availability.total_transactions - payment_method_availability.failed_transactions +
          CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END)::numeric /
          (payment_method_availability.total_transactions + 1)::numeric * 100)
        ELSE 100.00
      END,
      checked_at = NOW(),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update availability on payment status change
DROP TRIGGER IF EXISTS trigger_update_payment_method_availability ON payments;
CREATE TRIGGER trigger_update_payment_method_availability
  AFTER INSERT OR UPDATE OF status ON payments
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'failed', 'expired', 'cancelled'))
  EXECUTE FUNCTION update_payment_method_availability();

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_payment_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY payment_analytics_by_provider;
  REFRESH MATERIALIZED VIEW CONCURRENTLY payment_failure_analysis;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULED JOBS (for cron)
-- =====================================================
-- Run these via pg_cron or external scheduler:
--
-- Refresh analytics every hour:
-- SELECT refresh_payment_analytics();
--
-- Clean up old orchestration logs (90 days):
-- DELETE FROM payment_orchestration_logs WHERE created_at < NOW() - INTERVAL '90 days';
-- =====================================================

-- =====================================================
-- ROW LEVEL SECURITY (Optional - if RLS is enabled)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE user_payment_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orchestration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_fee_configuration ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user preferences (users can only see their own)
CREATE POLICY user_payment_preferences_select_policy ON user_payment_preferences
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY user_payment_preferences_update_policy ON user_payment_preferences
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- RLS Policies for orchestration logs (admins only)
CREATE POLICY payment_orchestration_logs_select_policy ON payment_orchestration_logs
  FOR SELECT
  USING (current_setting('app.current_user_role', true) = 'admin');

-- Public read access for availability and fee configuration
CREATE POLICY payment_method_availability_select_policy ON payment_method_availability
  FOR SELECT
  USING (true);

CREATE POLICY payment_fee_configuration_select_policy ON payment_fee_configuration
  FOR SELECT
  USING (active = true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_payment_preferences IS 'Stores user default payment method preferences';
COMMENT ON TABLE payment_orchestration_logs IS 'Audit log for payment orchestration decisions';
COMMENT ON TABLE payment_method_availability IS 'Tracks real-time availability of payment methods';
COMMENT ON TABLE payment_fee_configuration IS 'Configuration for payment processing fees';

COMMENT ON MATERIALIZED VIEW payment_analytics_by_provider IS 'Daily payment analytics aggregated by provider';
COMMENT ON MATERIALIZED VIEW payment_failure_analysis IS 'Analysis of payment failures by provider and reason';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Insert migration record
INSERT INTO schema_migrations (version, description, executed_at)
VALUES ('052', 'Payment Orchestration & Preferences', NOW())
ON CONFLICT (version) DO NOTHING;
