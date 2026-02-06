-- =====================================================
-- MIGRATION 051: BIR Tax Integration System
-- Bureau of Internal Revenue (Philippines) Compliance
-- =====================================================
-- Author: Development Coordinator
-- Date: 2026-02-07
-- Purpose: Enable BIR tax compliance with VAT calculation,
--          Official Receipt generation, and tax reporting
-- Dependencies: Migration 046 (Payment Transactions)
-- Related Issues: #20 (BIR Tax Integration)
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES
('051', 'BIR tax integration with VAT and receipt generation', NOW());

-- =====================================================
-- 1. BIR RECEIPTS TABLE
-- =====================================================
-- Official Receipt (OR) and Sales Invoice (SI) tracking
CREATE TABLE bir_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Receipt Identification
    receipt_number VARCHAR(50) UNIQUE NOT NULL, -- Sequential OR/SI number
    receipt_type TEXT CHECK (receipt_type IN (
        'official_receipt',  -- OR for services
        'sales_invoice',     -- SI for goods
        'acknowledgment'     -- AR for collections
    )) NOT NULL,

    -- Series Management
    series_prefix VARCHAR(10) NOT NULL DEFAULT 'OR',
    series_year INTEGER NOT NULL,
    sequence_number BIGINT NOT NULL,

    -- Transaction Reference
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    transaction_id VARCHAR(100),
    ride_id UUID,

    -- Customer Details (Required by BIR)
    customer_name VARCHAR(200) NOT NULL,
    customer_tin VARCHAR(20), -- Tax Identification Number (optional for individuals)
    customer_address TEXT,
    customer_business_style VARCHAR(200),

    -- Amount Breakdown (BIR Format)
    gross_amount DECIMAL(12, 2) NOT NULL,
    vat_exempt_amount DECIMAL(12, 2) DEFAULT 0,
    vat_zero_rated_amount DECIMAL(12, 2) DEFAULT 0,
    vat_able_amount DECIMAL(12, 2) NOT NULL,
    vat_amount DECIMAL(12, 2) NOT NULL,      -- 12% VAT
    total_amount DECIMAL(12, 2) NOT NULL,

    -- VAT Details
    vat_rate DECIMAL(5, 4) DEFAULT 0.12,     -- 12%
    is_vat_inclusive BOOLEAN DEFAULT true,

    -- Payment Details
    payment_method TEXT,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_reference VARCHAR(100),

    -- Service Description (Required by BIR)
    description TEXT NOT NULL,
    service_type TEXT CHECK (service_type IN (
        'ride_service',
        'delivery_service',
        'subscription',
        'commission',
        'other'
    )),

    -- BIR Permit Details
    bir_permit_number VARCHAR(50),
    permit_issue_date DATE,
    permit_valid_until DATE,

    -- Receipt Status
    status TEXT CHECK (status IN (
        'draft',
        'issued',
        'cancelled',
        'voided'
    )) DEFAULT 'issued',

    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID,

    -- Replacement (for cancelled receipts)
    replaces_receipt_id UUID REFERENCES bir_receipts(id),
    replaced_by_receipt_id UUID REFERENCES bir_receipts(id),

    -- Print/Email Tracking
    printed BOOLEAN DEFAULT false,
    printed_at TIMESTAMP WITH TIME ZONE,
    emailed BOOLEAN DEFAULT false,
    emailed_at TIMESTAMP WITH TIME ZONE,
    email_recipient VARCHAR(200),

    -- File Storage
    pdf_url VARCHAR(500),
    pdf_hash VARCHAR(64),

    -- Audit
    issued_by UUID,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bir_receipts_number ON bir_receipts(receipt_number);
CREATE INDEX idx_bir_receipts_series ON bir_receipts(series_year, sequence_number);
CREATE INDEX idx_bir_receipts_payment ON bir_receipts(payment_id);
CREATE INDEX idx_bir_receipts_transaction ON bir_receipts(transaction_id);
CREATE INDEX idx_bir_receipts_date ON bir_receipts(payment_date DESC);
CREATE INDEX idx_bir_receipts_status ON bir_receipts(status);
CREATE INDEX idx_bir_receipts_customer ON bir_receipts(customer_name);

COMMENT ON TABLE bir_receipts IS 'BIR-compliant Official Receipts and Sales Invoices';

-- =====================================================
-- 2. BIR TAX CALCULATIONS TABLE
-- =====================================================
-- Detailed tax calculation records
CREATE TABLE bir_tax_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference
    receipt_id UUID REFERENCES bir_receipts(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    calculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Base Amounts
    gross_sales DECIMAL(12, 2) NOT NULL,
    discounts DECIMAL(12, 2) DEFAULT 0,
    net_sales DECIMAL(12, 2) NOT NULL,

    -- VAT Calculation (Output VAT)
    vat_able_sales DECIMAL(12, 2) NOT NULL,
    vat_exempt_sales DECIMAL(12, 2) DEFAULT 0,
    vat_zero_rated_sales DECIMAL(12, 2) DEFAULT 0,
    output_vat DECIMAL(12, 2) NOT NULL,       -- 12% VAT collected

    -- Withholding Tax (for drivers/operators)
    subject_to_withholding BOOLEAN DEFAULT false,
    withholding_tax_rate DECIMAL(5, 4),
    withholding_tax_amount DECIMAL(12, 2) DEFAULT 0,
    withholding_tax_type TEXT CHECK (withholding_tax_type IN (
        'compensation',     -- Employee compensation
        'expanded',         -- Expanded withholding (professional fees)
        'final',           -- Final withholding
        'none'
    )) DEFAULT 'none',

    -- Net Amount
    net_amount_after_tax DECIMAL(12, 2) NOT NULL,

    -- Driver/Operator Split (if applicable)
    driver_id UUID,
    driver_earnings DECIMAL(12, 2),
    driver_tax_withheld DECIMAL(12, 2),
    platform_commission DECIMAL(12, 2),
    platform_commission_rate DECIMAL(5, 4),

    -- Tax Breakdown JSON
    calculation_details JSONB DEFAULT '{}',
    -- Example: {
    --   "base_fare": 100,
    --   "distance_fare": 50,
    --   "time_fare": 20,
    --   "surge": 1.5,
    --   "vat_basis": 145.45,
    --   "vat_12%": 17.45,
    --   "total": 162.90
    -- }

    -- Compliance Flags
    calculation_verified BOOLEAN DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bir_tax_receipt ON bir_tax_calculations(receipt_id);
CREATE INDEX idx_bir_tax_payment ON bir_tax_calculations(payment_id);
CREATE INDEX idx_bir_tax_date ON bir_tax_calculations(calculation_date DESC);
CREATE INDEX idx_bir_tax_driver ON bir_tax_calculations(driver_id) WHERE driver_id IS NOT NULL;

COMMENT ON TABLE bir_tax_calculations IS 'Detailed VAT and withholding tax calculations';

-- =====================================================
-- 3. BIR MONTHLY REPORTS TABLE
-- =====================================================
-- Monthly sales and VAT summary for BIR filing
CREATE TABLE bir_monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Report Period
    report_month INTEGER CHECK (report_month >= 1 AND report_month <= 12) NOT NULL,
    report_year INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Sales Summary
    total_gross_sales DECIMAL(15, 2) NOT NULL,
    total_vat_able_sales DECIMAL(15, 2) NOT NULL,
    total_vat_exempt_sales DECIMAL(15, 2) DEFAULT 0,
    total_vat_zero_rated_sales DECIMAL(15, 2) DEFAULT 0,

    -- VAT Summary (Output VAT)
    total_output_vat DECIMAL(15, 2) NOT NULL,

    -- Transaction Counts
    total_transactions INTEGER NOT NULL,
    total_receipts_issued INTEGER NOT NULL,
    cancelled_receipts INTEGER DEFAULT 0,

    -- Payment Method Breakdown
    cash_sales DECIMAL(15, 2) DEFAULT 0,
    gcash_sales DECIMAL(15, 2) DEFAULT 0,
    maya_sales DECIMAL(15, 2) DEFAULT 0,
    other_ewallet_sales DECIMAL(15, 2) DEFAULT 0,

    -- Withholding Tax Summary
    total_withholding_tax DECIMAL(15, 2) DEFAULT 0,

    -- Driver Earnings Summary
    total_driver_earnings DECIMAL(15, 2) DEFAULT 0,
    total_driver_tax_withheld DECIMAL(15, 2) DEFAULT 0,
    total_platform_commission DECIMAL(15, 2) DEFAULT 0,

    -- BIR Form References
    form_2550m_data JSONB DEFAULT '{}',  -- Monthly VAT Declaration
    form_2550q_data JSONB DEFAULT '{}',  -- Quarterly VAT Return (if applicable)

    -- Report Status
    status TEXT CHECK (status IN (
        'draft',
        'generated',
        'reviewed',
        'filed',
        'acknowledged'
    )) DEFAULT 'draft',

    -- Filing Details
    filing_deadline DATE,
    filed_at TIMESTAMP WITH TIME ZONE,
    filed_by UUID,
    bir_reference_number VARCHAR(100),
    bir_acknowledgment_date DATE,

    -- File Attachments
    report_file_url VARCHAR(500),
    alphalist_file_url VARCHAR(500),  -- Alphalist of payees (withholding tax)

    -- Metadata
    generated_by UUID,
    generated_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    CONSTRAINT unique_monthly_report UNIQUE (report_year, report_month)
);

CREATE INDEX idx_bir_monthly_period ON bir_monthly_reports(report_year DESC, report_month DESC);
CREATE INDEX idx_bir_monthly_status ON bir_monthly_reports(status);
CREATE INDEX idx_bir_monthly_deadline ON bir_monthly_reports(filing_deadline);

COMMENT ON TABLE bir_monthly_reports IS 'Monthly VAT and sales summary for BIR 2550M filing';

-- =====================================================
-- 4. BIR DRIVER INCOME TABLE
-- =====================================================
-- Driver income tracking for BIR 2316 (Certificate of Compensation)
CREATE TABLE bir_driver_income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Driver Reference
    driver_id UUID NOT NULL,
    driver_name VARCHAR(200) NOT NULL,
    driver_tin VARCHAR(20),
    driver_address TEXT,

    -- Period
    income_year INTEGER NOT NULL,
    income_month INTEGER CHECK (income_month >= 1 AND income_month <= 12),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Income Summary
    gross_earnings DECIMAL(12, 2) NOT NULL,
    platform_commission DECIMAL(12, 2) NOT NULL,
    net_earnings DECIMAL(12, 2) NOT NULL,

    -- Trip Summary
    total_trips INTEGER NOT NULL,
    total_distance_km DECIMAL(10, 2),

    -- Tax Withholding
    withholding_tax_rate DECIMAL(5, 4),
    withholding_tax_amount DECIMAL(12, 2) DEFAULT 0,
    non_taxable_amount DECIMAL(12, 2) DEFAULT 0,  -- Below threshold
    taxable_amount DECIMAL(12, 2) NOT NULL,

    -- Classification
    employment_type TEXT CHECK (employment_type IN (
        'employee',             -- Regular employee
        'professional',         -- Professional/self-employed
        'business',            -- Business income
        'mixed'                -- Mixed income sources
    )) DEFAULT 'professional',

    -- BIR Form 2316 Data (if employee)
    form_2316_data JSONB DEFAULT '{}',

    -- Status
    status TEXT CHECK (status IN (
        'draft',
        'calculated',
        'issued',
        'filed'
    )) DEFAULT 'draft',

    certificate_issued BOOLEAN DEFAULT false,
    certificate_issued_at TIMESTAMP WITH TIME ZONE,
    certificate_number VARCHAR(50),

    -- File Storage
    certificate_pdf_url VARCHAR(500),

    -- Metadata
    generated_by UUID,
    generated_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint for monthly records
    CONSTRAINT unique_driver_monthly_income UNIQUE (driver_id, income_year, income_month)
);

CREATE INDEX idx_bir_driver_income_driver ON bir_driver_income(driver_id);
CREATE INDEX idx_bir_driver_income_period ON bir_driver_income(income_year DESC, income_month DESC);
CREATE INDEX idx_bir_driver_income_status ON bir_driver_income(status);
CREATE INDEX idx_bir_driver_income_tin ON bir_driver_income(driver_tin) WHERE driver_tin IS NOT NULL;

COMMENT ON TABLE bir_driver_income IS 'Driver income tracking for BIR 2316 and withholding tax';

-- =====================================================
-- 5. BIR RECEIPT SERIES TABLE
-- =====================================================
-- Manage OR/SI number series
CREATE TABLE bir_receipt_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Series Details
    series_name VARCHAR(100) NOT NULL,
    series_prefix VARCHAR(10) NOT NULL,
    series_year INTEGER NOT NULL,

    -- Number Range
    start_number BIGINT NOT NULL,
    end_number BIGINT NOT NULL,
    current_number BIGINT NOT NULL,

    -- BIR ATP Details
    atp_number VARCHAR(50),  -- Authority to Print
    atp_issue_date DATE,
    atp_valid_until DATE,

    -- Printer Details
    printer_name VARCHAR(200),
    printer_tin VARCHAR(20),
    printer_address TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_depleted BOOLEAN DEFAULT false,

    -- Usage Statistics
    total_issued INTEGER DEFAULT 0,
    total_cancelled INTEGER DEFAULT 0,
    remaining_numbers INTEGER,

    -- Timestamps
    activated_at TIMESTAMP WITH TIME ZONE,
    depleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint
    CONSTRAINT unique_series UNIQUE (series_prefix, series_year, start_number)
);

CREATE INDEX idx_bir_series_active ON bir_receipt_series(is_active, series_year);
CREATE INDEX idx_bir_series_prefix ON bir_receipt_series(series_prefix, series_year);

COMMENT ON TABLE bir_receipt_series IS 'BIR receipt number series management with ATP tracking';

-- =====================================================
-- 6. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to get next receipt number
CREATE OR REPLACE FUNCTION get_next_receipt_number(
    p_series_prefix VARCHAR(10),
    p_series_year INTEGER
)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_series_id UUID;
    v_current_number BIGINT;
    v_receipt_number VARCHAR(50);
BEGIN
    -- Get active series
    SELECT id, current_number INTO v_series_id, v_current_number
    FROM bir_receipt_series
    WHERE series_prefix = p_series_prefix
        AND series_year = p_series_year
        AND is_active = true
        AND is_depleted = false
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active receipt series found for % %', p_series_prefix, p_series_year;
    END IF;

    -- Increment current number
    UPDATE bir_receipt_series
    SET current_number = current_number + 1,
        total_issued = total_issued + 1,
        remaining_numbers = end_number - current_number - 1,
        is_depleted = (current_number + 1 >= end_number),
        depleted_at = CASE WHEN current_number + 1 >= end_number THEN NOW() ELSE depleted_at END
    WHERE id = v_series_id;

    -- Format receipt number
    v_receipt_number := p_series_prefix || '-' || p_series_year || '-' || LPAD(v_current_number::TEXT, 8, '0');

    RETURN v_receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate VAT
CREATE OR REPLACE FUNCTION calculate_vat_amounts(
    p_gross_amount DECIMAL(12,2),
    p_is_vat_inclusive BOOLEAN DEFAULT true,
    p_vat_rate DECIMAL(5,4) DEFAULT 0.12
)
RETURNS TABLE (
    vat_able_amount DECIMAL(12,2),
    vat_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2)
) AS $$
BEGIN
    IF p_is_vat_inclusive THEN
        -- Amount already includes VAT
        -- VAT = Gross / 1.12 * 0.12
        -- VAT-able = Gross / 1.12
        RETURN QUERY SELECT
            ROUND(p_gross_amount / (1 + p_vat_rate), 2) as vat_able_amount,
            ROUND(p_gross_amount - (p_gross_amount / (1 + p_vat_rate)), 2) as vat_amount,
            p_gross_amount as total_amount;
    ELSE
        -- VAT needs to be added
        RETURN QUERY SELECT
            p_gross_amount as vat_able_amount,
            ROUND(p_gross_amount * p_vat_rate, 2) as vat_amount,
            ROUND(p_gross_amount * (1 + p_vat_rate), 2) as total_amount;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate VAT on receipt insert
CREATE OR REPLACE FUNCTION auto_calculate_receipt_vat()
RETURNS TRIGGER AS $$
DECLARE
    v_calc RECORD;
BEGIN
    -- Calculate VAT if not explicitly set
    IF NEW.vat_amount IS NULL OR NEW.vat_able_amount IS NULL THEN
        SELECT * INTO v_calc FROM calculate_vat_amounts(
            NEW.gross_amount,
            NEW.is_vat_inclusive,
            NEW.vat_rate
        );

        NEW.vat_able_amount := v_calc.vat_able_amount;
        NEW.vat_amount := v_calc.vat_amount;
        NEW.total_amount := v_calc.total_amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_receipt_vat
    BEFORE INSERT OR UPDATE ON bir_receipts
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_receipt_vat();

-- Update updated_at timestamp triggers
CREATE TRIGGER trigger_bir_receipts_updated_at
    BEFORE UPDATE ON bir_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_bir_tax_calc_updated_at
    BEFORE UPDATE ON bir_tax_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_bir_monthly_updated_at
    BEFORE UPDATE ON bir_monthly_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_bir_driver_income_updated_at
    BEFORE UPDATE ON bir_driver_income
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_bir_series_updated_at
    BEFORE UPDATE ON bir_receipt_series
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

-- =====================================================
-- 7. MATERIALIZED VIEWS FOR REPORTING
-- =====================================================

-- Daily Sales Summary
CREATE MATERIALIZED VIEW bir_daily_sales_summary AS
SELECT
    DATE(payment_date) as sales_date,
    COUNT(*) as total_receipts,
    SUM(gross_amount) as gross_sales,
    SUM(vat_able_amount) as vat_able_sales,
    SUM(vat_amount) as output_vat,
    SUM(total_amount) as total_sales,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_receipts,
    COUNT(DISTINCT customer_name) as unique_customers
FROM bir_receipts
WHERE payment_date >= CURRENT_DATE - INTERVAL '90 days'
    AND status = 'issued'
GROUP BY DATE(payment_date)
ORDER BY sales_date DESC;

CREATE INDEX idx_bir_daily_sales_date ON bir_daily_sales_summary(sales_date DESC);

-- Monthly VAT Summary View
CREATE MATERIALIZED VIEW bir_monthly_vat_summary AS
SELECT
    DATE_TRUNC('month', payment_date)::DATE as month_start,
    EXTRACT(YEAR FROM payment_date)::INTEGER as year,
    EXTRACT(MONTH FROM payment_date)::INTEGER as month,
    COUNT(*) as total_receipts,
    SUM(vat_able_amount) as vat_able_sales,
    SUM(vat_exempt_amount) as vat_exempt_sales,
    SUM(vat_zero_rated_amount) as vat_zero_rated_sales,
    SUM(vat_amount) as output_vat,
    SUM(total_amount) as total_sales
FROM bir_receipts
WHERE status = 'issued'
    AND payment_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', payment_date), EXTRACT(YEAR FROM payment_date), EXTRACT(MONTH FROM payment_date)
ORDER BY month_start DESC;

-- Driver Income Summary View
CREATE MATERIALIZED VIEW bir_driver_income_summary AS
SELECT
    driver_id,
    driver_name,
    income_year,
    SUM(gross_earnings) as annual_gross_earnings,
    SUM(net_earnings) as annual_net_earnings,
    SUM(withholding_tax_amount) as annual_tax_withheld,
    SUM(total_trips) as annual_trips,
    COUNT(*) as months_active
FROM bir_driver_income
WHERE income_year >= EXTRACT(YEAR FROM CURRENT_DATE) - 1
GROUP BY driver_id, driver_name, income_year
ORDER BY income_year DESC, annual_gross_earnings DESC;

-- =====================================================
-- 8. ROW-LEVEL SECURITY
-- =====================================================

ALTER TABLE bir_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_tax_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_driver_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_receipt_series ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. SEED DATA
-- =====================================================

-- Insert initial receipt series for 2026
INSERT INTO bir_receipt_series (
    series_name,
    series_prefix,
    series_year,
    start_number,
    end_number,
    current_number,
    atp_number,
    atp_issue_date,
    atp_valid_until,
    is_active,
    remaining_numbers
) VALUES (
    'Official Receipts 2026',
    'OR',
    2026,
    1,
    100000,
    1,
    'ATP-2026-001',
    '2026-01-01',
    '2026-12-31',
    true,
    99999
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
        'bir_receipts',
        'bir_tax_calculations',
        'bir_monthly_reports',
        'bir_driver_income',
        'bir_receipt_series'
    )
ORDER BY table_name;

-- Test VAT calculation function
SELECT * FROM calculate_vat_amounts(112.00, true, 0.12);  -- Should return vat_able: 100, vat: 12, total: 112

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MIGRATION 051: BIR Tax Integration - COMPLETE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - bir_receipts (Official Receipt generation)';
    RAISE NOTICE '  - bir_tax_calculations (VAT calculations)';
    RAISE NOTICE '  - bir_monthly_reports (Monthly VAT reports)';
    RAISE NOTICE '  - bir_driver_income (Driver income tracking)';
    RAISE NOTICE '  - bir_receipt_series (OR number series)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - 12%% VAT calculation (inclusive/exclusive)';
    RAISE NOTICE '  - Sequential OR/SI numbering';
    RAISE NOTICE '  - BIR-compliant receipt format';
    RAISE NOTICE '  - Monthly VAT summary (Form 2550M)';
    RAISE NOTICE '  - Driver income tracking (Form 2316)';
    RAISE NOTICE '  - Withholding tax calculation';
    RAISE NOTICE '  - ATP (Authority to Print) management';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Implement BIR tax calculation service';
    RAISE NOTICE '  2. Implement receipt generation service';
    RAISE NOTICE '  3. Implement tax reporting service';
    RAISE NOTICE '  4. Create BIR API endpoints';
    RAISE NOTICE '  5. Build receipt PDF templates';
    RAISE NOTICE '=====================================================';
END $$;
