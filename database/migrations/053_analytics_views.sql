-- =====================================================
-- MIGRATION 053: Analytics Views & Materialized Views
-- Advanced Analytics & Reporting System
-- =====================================================
-- Author: Development Coordinator
-- Date: 2026-02-07
-- Purpose: Create comprehensive analytics materialized views for business intelligence,
--          driver/passenger insights, and financial reporting
-- Dependencies: Core schema, payment transactions, bookings
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES
('053', 'Analytics views and materialized views for BI reporting', NOW());

-- =====================================================
-- 1. DAILY REVENUE SUMMARY
-- =====================================================
-- Daily revenue aggregation for financial dashboard
-- Refreshed: Daily at 1 AM via cron job

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_revenue_summary AS
SELECT
    DATE(b.created_at) as date,

    -- Booking metrics
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COUNT(CASE WHEN b.status IN ('requested', 'searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress') THEN 1 END) as active_bookings,

    -- Revenue metrics (completed bookings only)
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_fare ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_fare * 0.20 ELSE 0 END), 0) as platform_commission,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_fare * 0.80 ELSE 0 END), 0) as driver_earnings,
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_fare END), 0) as avg_booking_value,

    -- Service type breakdown
    COUNT(CASE WHEN b.service_type = 'ride_4w' AND b.status = 'completed' THEN 1 END) as ride_4w_count,
    COUNT(CASE WHEN b.service_type = 'ride_2w' AND b.status = 'completed' THEN 1 END) as ride_2w_count,
    COUNT(CASE WHEN b.service_type = 'send_delivery' AND b.status = 'completed' THEN 1 END) as delivery_count,
    COALESCE(SUM(CASE WHEN b.service_type = 'ride_4w' AND b.status = 'completed' THEN b.total_fare ELSE 0 END), 0) as ride_4w_revenue,
    COALESCE(SUM(CASE WHEN b.service_type = 'ride_2w' AND b.status = 'completed' THEN b.total_fare ELSE 0 END), 0) as ride_2w_revenue,
    COALESCE(SUM(CASE WHEN b.service_type = 'send_delivery' AND b.status = 'completed' THEN b.total_fare ELSE 0 END), 0) as delivery_revenue,

    -- User activity
    COUNT(DISTINCT b.driver_id) as active_drivers,
    COUNT(DISTINCT b.customer_id) as active_passengers,

    -- Performance metrics
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.customer_rating END), 0) as avg_customer_rating,
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.driver_rating END), 0) as avg_driver_rating,

    -- Cancellation rate
    ROUND(
        CASE
            WHEN COUNT(*) > 0 THEN
                (COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 0
        END, 2
    ) as cancellation_rate,

    -- Completion rate
    ROUND(
        CASE
            WHEN COUNT(*) > 0 THEN
                (COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 0
        END, 2
    ) as completion_rate

FROM bookings b
WHERE b.created_at >= CURRENT_DATE - INTERVAL '365 days' -- Keep 1 year of data
GROUP BY DATE(b.created_at)
ORDER BY date DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_revenue_summary_date
ON daily_revenue_summary(date);

COMMENT ON MATERIALIZED VIEW daily_revenue_summary IS 'Daily revenue aggregation with booking metrics, refreshed daily at 1 AM';

-- =====================================================
-- 2. DRIVER PERFORMANCE METRICS
-- =====================================================
-- Driver performance analytics for ranking and monitoring
-- Refreshed: Daily at 2 AM via cron job

CREATE MATERIALIZED VIEW IF NOT EXISTS driver_performance_metrics AS
SELECT
    d.id as driver_id,
    d.driver_code,
    CONCAT(d.first_name, ' ', d.last_name) as driver_name,
    d.phone as driver_phone,
    d.status as current_status,
    d.primary_service,

    -- Trip statistics (all time)
    COUNT(b.id) as total_trips,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_trips,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_trips,
    COUNT(CASE WHEN b.status = 'failed' THEN 1 END) as failed_trips,

    -- Recent activity (last 7 days)
    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as trips_last_7_days,
    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as trips_last_30_days,

    -- Earnings (completed trips only)
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_fare * 0.80 ELSE 0 END), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN b.total_fare * 0.80 ELSE 0 END), 0) as earnings_last_7_days,
    COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN b.total_fare * 0.80 ELSE 0 END), 0) as earnings_last_30_days,
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_fare * 0.80 END), 0) as avg_earnings_per_trip,

    -- Rating metrics
    d.rating as overall_rating,
    COALESCE(AVG(b.driver_rating), 0) as avg_trip_rating,
    COUNT(CASE WHEN b.driver_rating >= 4 THEN 1 END) as positive_ratings,
    COUNT(CASE WHEN b.driver_rating <= 2 THEN 1 END) as negative_ratings,

    -- Performance metrics
    ROUND(
        CASE
            WHEN COUNT(b.id) > 0 THEN
                (COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::DECIMAL / COUNT(b.id)::DECIMAL) * 100
            ELSE 0
        END, 2
    ) as completion_rate,

    ROUND(
        CASE
            WHEN COUNT(b.id) > 0 THEN
                (COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END)::DECIMAL / COUNT(b.id)::DECIMAL) * 100
            ELSE 0
        END, 2
    ) as cancellation_rate,

    -- Acceptance rate (trips accepted / trips assigned)
    ROUND(
        CASE
            WHEN COUNT(CASE WHEN b.assigned_at IS NOT NULL THEN 1 END) > 0 THEN
                (COUNT(CASE WHEN b.accepted_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(CASE WHEN b.assigned_at IS NOT NULL THEN 1 END)::DECIMAL) * 100
            ELSE 100
        END, 2
    ) as acceptance_rate,

    -- Trip duration
    COALESCE(
        AVG(
            CASE
                WHEN b.status = 'completed' AND b.completed_at IS NOT NULL AND b.actual_pickup_time IS NOT NULL
                THEN EXTRACT(EPOCH FROM (b.completed_at - b.actual_pickup_time)) / 60
            END
        ), 0
    ) as avg_trip_duration_minutes,

    -- Wait time (pickup time - assigned time)
    COALESCE(
        AVG(
            CASE
                WHEN b.actual_pickup_time IS NOT NULL AND b.assigned_at IS NOT NULL
                THEN EXTRACT(EPOCH FROM (b.actual_pickup_time - b.assigned_at)) / 60
            END
        ), 0
    ) as avg_wait_time_minutes,

    -- Activity tracking
    MAX(b.created_at) as last_trip_date,
    d.is_active,
    d.created_at as driver_since,

    -- Performance tier (VIP, Premium, Regular based on metrics)
    CASE
        WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 END) >= 500 AND d.rating >= 4.8 THEN 'VIP'
        WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 END) >= 100 AND d.rating >= 4.5 THEN 'Premium'
        ELSE 'Regular'
    END as performance_tier

FROM drivers d
LEFT JOIN bookings b ON d.id = b.driver_id
WHERE d.is_active = true
GROUP BY d.id, d.driver_code, d.first_name, d.last_name, d.phone, d.status, d.primary_service, d.rating, d.is_active, d.created_at
ORDER BY total_earnings DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_performance_metrics_driver_id
ON driver_performance_metrics(driver_id);

COMMENT ON MATERIALIZED VIEW driver_performance_metrics IS 'Driver performance analytics with earnings and ratings, refreshed daily at 2 AM';

-- =====================================================
-- 3. PASSENGER RETENTION COHORTS
-- =====================================================
-- Passenger retention cohort analysis for customer insights
-- Refreshed: Daily at 3 AM via cron job

CREATE MATERIALIZED VIEW IF NOT EXISTS passenger_retention_cohorts AS
SELECT
    b.customer_id as passenger_id,

    -- First booking information
    MIN(b.created_at) as first_booking_date,
    DATE_TRUNC('month', MIN(b.created_at)) as cohort_month,

    -- Booking activity
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,

    -- Recent activity
    MAX(b.created_at) as last_booking_date,
    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as bookings_last_7_days,
    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as bookings_last_30_days,
    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as bookings_last_90_days,

    -- Lifetime value (completed bookings only)
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_fare ELSE 0 END), 0) as lifetime_value,
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_fare END), 0) as avg_booking_value,

    -- Service preferences
    COUNT(CASE WHEN b.service_type = 'ride_4w' THEN 1 END) as ride_4w_count,
    COUNT(CASE WHEN b.service_type = 'ride_2w' THEN 1 END) as ride_2w_count,
    COUNT(CASE WHEN b.service_type = 'send_delivery' THEN 1 END) as delivery_count,

    -- Rating behavior
    COALESCE(AVG(b.customer_rating), 0) as avg_rating_given,
    COUNT(CASE WHEN b.customer_rating IS NOT NULL THEN 1 END) as ratings_given_count,

    -- Engagement metrics
    EXTRACT(DAY FROM (MAX(b.created_at) - MIN(b.created_at))) as days_active,
    ROUND(
        COUNT(b.id)::DECIMAL / NULLIF(EXTRACT(DAY FROM (MAX(b.created_at) - MIN(b.created_at)))::DECIMAL, 0), 2
    ) as bookings_per_day,

    -- Churn detection (no booking in last 30 days)
    CASE
        WHEN MAX(b.created_at) < CURRENT_DATE - INTERVAL '30 days' THEN true
        ELSE false
    END as is_churned,

    -- Days since last booking
    EXTRACT(DAY FROM (CURRENT_DATE - MAX(b.created_at))) as days_since_last_booking,

    -- Customer tier based on lifetime value and frequency
    CASE
        WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 END) >= 100
             OR COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_fare ELSE 0 END), 0) >= 50000 THEN 'VIP'
        WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 END) >= 20
             OR COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_fare ELSE 0 END), 0) >= 10000 THEN 'Premium'
        ELSE 'Regular'
    END as customer_tier,

    -- Retention status
    CASE
        WHEN MAX(b.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 'Active'
        WHEN MAX(b.created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 'At Risk'
        WHEN MAX(b.created_at) >= CURRENT_DATE - INTERVAL '90 days' THEN 'Inactive'
        ELSE 'Churned'
    END as retention_status

FROM bookings b
GROUP BY b.customer_id
HAVING COUNT(b.id) > 0
ORDER BY lifetime_value DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_passenger_retention_cohorts_passenger_id
ON passenger_retention_cohorts(passenger_id);

COMMENT ON MATERIALIZED VIEW passenger_retention_cohorts IS 'Passenger retention cohort analysis with lifetime value, refreshed daily at 3 AM';

-- =====================================================
-- 4. BOOKING TRENDS HOURLY
-- =====================================================
-- Hourly booking trends for demand forecasting and surge pricing
-- Refreshed: Hourly at minute 5 via cron job

CREATE MATERIALIZED VIEW IF NOT EXISTS booking_trends_hourly AS
SELECT
    EXTRACT(HOUR FROM b.created_at)::INTEGER as hour_of_day,
    EXTRACT(DOW FROM b.created_at)::INTEGER as day_of_week, -- 0 = Sunday, 6 = Saturday
    CASE EXTRACT(DOW FROM b.created_at)::INTEGER
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name,

    -- Booking volume
    COUNT(*) as booking_count,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_count,

    -- Revenue metrics (completed only)
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_fare END), 0) as avg_fare,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_fare ELSE 0 END), 0) as total_revenue,

    -- Service type distribution
    COUNT(CASE WHEN b.service_type = 'ride_4w' THEN 1 END) as ride_4w_count,
    COUNT(CASE WHEN b.service_type = 'ride_2w' THEN 1 END) as ride_2w_count,
    COUNT(CASE WHEN b.service_type = 'send_delivery' THEN 1 END) as delivery_count,

    -- Performance metrics
    COALESCE(
        AVG(
            CASE
                WHEN b.actual_pickup_time IS NOT NULL AND b.requested_at IS NOT NULL
                THEN EXTRACT(EPOCH FROM (b.actual_pickup_time - b.requested_at)) / 60
            END
        ), 0
    ) as avg_wait_time_minutes,

    COALESCE(
        AVG(
            CASE
                WHEN b.status = 'completed' AND b.completed_at IS NOT NULL AND b.actual_pickup_time IS NOT NULL
                THEN EXTRACT(EPOCH FROM (b.completed_at - b.actual_pickup_time)) / 60
            END
        ), 0
    ) as avg_trip_duration_minutes,

    -- Surge indicators
    COALESCE(AVG(b.surge_multiplier), 1.0) as avg_surge_multiplier,
    COUNT(CASE WHEN b.surge_multiplier > 1.0 THEN 1 END) as surge_bookings_count,

    -- Driver availability (unique drivers active in this hour)
    COUNT(DISTINCT b.driver_id) as unique_drivers,
    COUNT(DISTINCT b.customer_id) as unique_passengers,

    -- Demand indicators (high demand = more bookings per driver)
    ROUND(
        COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT b.driver_id)::DECIMAL, 0), 2
    ) as bookings_per_driver_ratio

FROM bookings b
WHERE b.created_at >= CURRENT_DATE - INTERVAL '90 days' -- Keep 90 days for trend analysis
GROUP BY
    EXTRACT(HOUR FROM b.created_at)::INTEGER,
    EXTRACT(DOW FROM b.created_at)::INTEGER
ORDER BY day_of_week, hour_of_day;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_trends_hourly_hour_day
ON booking_trends_hourly(hour_of_day, day_of_week);

COMMENT ON MATERIALIZED VIEW booking_trends_hourly IS 'Hourly booking trends by day of week for demand forecasting, refreshed hourly at minute 5';

-- =====================================================
-- 5. PAYMENT METHOD DISTRIBUTION
-- =====================================================
-- Payment method analytics for financial reconciliation
-- Refreshed: Hourly at minute 10 via cron job

CREATE MATERIALIZED VIEW IF NOT EXISTS payment_method_distribution AS
SELECT
    p.payment_method,
    p.status as payment_status,

    -- Transaction counts
    COUNT(*) as transaction_count,
    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as successful_count,
    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN p.status = 'refunded' THEN 1 END) as refunded_count,

    -- Amount metrics (completed transactions)
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_amount,
    COALESCE(AVG(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as avg_amount,
    COALESCE(MIN(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as min_amount,
    COALESCE(MAX(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as max_amount,

    -- Success rate
    ROUND(
        CASE
            WHEN COUNT(*) > 0 THEN
                (COUNT(CASE WHEN p.status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 0
        END, 2
    ) as success_rate,

    -- Failure rate
    ROUND(
        CASE
            WHEN COUNT(*) > 0 THEN
                (COUNT(CASE WHEN p.status = 'failed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 0
        END, 2
    ) as failure_rate,

    -- Provider breakdown (for GCash/Maya)
    p.provider,

    -- Recent activity (last 7 days)
    COUNT(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as transactions_last_7_days,
    COALESCE(SUM(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '7 days' AND p.status = 'completed' THEN p.amount ELSE 0 END), 0) as amount_last_7_days,

    -- Recent activity (last 30 days)
    COUNT(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as transactions_last_30_days,
    COALESCE(SUM(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '30 days' AND p.status = 'completed' THEN p.amount ELSE 0 END), 0) as amount_last_30_days,

    -- Refund metrics
    COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END), 0) as total_refunded,

    -- Latest transaction
    MAX(p.created_at) as last_transaction_date

FROM payments p
WHERE p.created_at >= CURRENT_DATE - INTERVAL '365 days' -- Keep 1 year of payment data
GROUP BY p.payment_method, p.status, p.provider
ORDER BY total_amount DESC;

-- Create index for concurrent refresh
CREATE INDEX IF NOT EXISTS idx_payment_method_distribution_method_status
ON payment_method_distribution(payment_method, payment_status);

COMMENT ON MATERIALIZED VIEW payment_method_distribution IS 'Payment method analytics with success rates and amounts, refreshed hourly at minute 10';

-- =====================================================
-- AUTO-REFRESH FUNCTION
-- =====================================================
-- Function to refresh all materialized views
-- Call this via cron job: 0 2 * * * psql -c "SELECT refresh_analytics_views();"

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS TEXT AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
    result_text TEXT;
BEGIN
    start_time := clock_timestamp();
    result_text := 'Analytics views refresh started at ' || start_time || E'\n\n';

    -- Refresh daily_revenue_summary
    RAISE NOTICE 'Refreshing daily_revenue_summary...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue_summary;
    result_text := result_text || 'daily_revenue_summary: OK' || E'\n';

    -- Refresh driver_performance_metrics
    RAISE NOTICE 'Refreshing driver_performance_metrics...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY driver_performance_metrics;
    result_text := result_text || 'driver_performance_metrics: OK' || E'\n';

    -- Refresh passenger_retention_cohorts
    RAISE NOTICE 'Refreshing passenger_retention_cohorts...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY passenger_retention_cohorts;
    result_text := result_text || 'passenger_retention_cohorts: OK' || E'\n';

    -- Refresh booking_trends_hourly
    RAISE NOTICE 'Refreshing booking_trends_hourly...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY booking_trends_hourly;
    result_text := result_text || 'booking_trends_hourly: OK' || E'\n';

    -- Refresh payment_method_distribution
    RAISE NOTICE 'Refreshing payment_method_distribution...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY payment_method_distribution;
    result_text := result_text || 'payment_method_distribution: OK' || E'\n';

    end_time := clock_timestamp();
    duration := end_time - start_time;

    result_text := result_text || E'\n' || 'Refresh completed at ' || end_time || E'\n';
    result_text := result_text || 'Total duration: ' || duration || E'\n';

    -- Log to analytics_refresh_log if table exists
    INSERT INTO analytics_refresh_log (refresh_time, duration_seconds, status, details)
    VALUES (start_time, EXTRACT(EPOCH FROM duration), 'success', result_text)
    ON CONFLICT DO NOTHING;

    RETURN result_text;
EXCEPTION
    WHEN OTHERS THEN
        result_text := result_text || E'\nERROR: ' || SQLERRM;

        -- Log error
        INSERT INTO analytics_refresh_log (refresh_time, duration_seconds, status, details)
        VALUES (start_time, EXTRACT(EPOCH FROM (clock_timestamp() - start_time)), 'failed', result_text)
        ON CONFLICT DO NOTHING;

        RETURN result_text;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_analytics_views() IS 'Refreshes all analytics materialized views, logs execution time and status';

-- =====================================================
-- ANALYTICS REFRESH LOG TABLE
-- =====================================================
-- Track refresh execution history for monitoring

CREATE TABLE IF NOT EXISTS analytics_refresh_log (
    id SERIAL PRIMARY KEY,
    refresh_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds DECIMAL(10,2),
    status TEXT CHECK (status IN ('success', 'failed', 'partial')) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_refresh_log_time
ON analytics_refresh_log(refresh_time DESC);

COMMENT ON TABLE analytics_refresh_log IS 'Tracks analytics materialized view refresh execution history';

-- =====================================================
-- SCHEDULED REFRESH SETUP (DOCUMENTATION)
-- =====================================================
-- Add to crontab for automated refresh:
--
-- Daily refresh at 2 AM (main metrics):
-- 0 2 * * * psql -U ops_user -d opstower_db -c "SELECT refresh_analytics_views();"
--
-- Hourly refresh for real-time data:
-- 5 * * * * psql -U ops_user -d opstower_db -c "REFRESH MATERIALIZED VIEW CONCURRENTLY booking_trends_hourly; REFRESH MATERIALIZED VIEW CONCURRENTLY payment_method_distribution;"
--
-- Note: CONCURRENTLY requires unique indexes (already created above)

-- =====================================================
-- INITIAL REFRESH
-- =====================================================
-- Perform initial population of all views

SELECT refresh_analytics_views();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Allow analysts and dashboards to query views

GRANT SELECT ON daily_revenue_summary TO ops_viewer, ops_operator, ops_admin;
GRANT SELECT ON driver_performance_metrics TO ops_viewer, ops_operator, ops_admin;
GRANT SELECT ON passenger_retention_cohorts TO ops_viewer, ops_operator, ops_admin;
GRANT SELECT ON booking_trends_hourly TO ops_viewer, ops_operator, ops_admin;
GRANT SELECT ON payment_method_distribution TO ops_viewer, ops_operator, ops_admin;
GRANT SELECT ON analytics_refresh_log TO ops_viewer, ops_operator, ops_admin;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify views are populated
DO $$
DECLARE
    revenue_count INTEGER;
    driver_count INTEGER;
    passenger_count INTEGER;
    trends_count INTEGER;
    payment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO revenue_count FROM daily_revenue_summary;
    SELECT COUNT(*) INTO driver_count FROM driver_performance_metrics;
    SELECT COUNT(*) INTO passenger_count FROM passenger_retention_cohorts;
    SELECT COUNT(*) INTO trends_count FROM booking_trends_hourly;
    SELECT COUNT(*) INTO payment_count FROM payment_method_distribution;

    RAISE NOTICE 'Analytics Views Summary:';
    RAISE NOTICE '  - daily_revenue_summary: % rows', revenue_count;
    RAISE NOTICE '  - driver_performance_metrics: % rows', driver_count;
    RAISE NOTICE '  - passenger_retention_cohorts: % rows', passenger_count;
    RAISE NOTICE '  - booking_trends_hourly: % rows', trends_count;
    RAISE NOTICE '  - payment_method_distribution: % rows', payment_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Migration 053 completed successfully!';
END $$;
