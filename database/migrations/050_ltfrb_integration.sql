-- =====================================================
-- MIGRATION 050: LTFRB Integration System
-- Land Transportation Franchising and Regulatory Board
-- =====================================================
-- Author: Development Coordinator
-- Date: 2026-02-07
-- Purpose: Enable LTFRB compliance with driver verification,
--          vehicle franchise validation, and trip reporting
-- Dependencies: Migration 001 (Initial Setup)
-- Related Issues: #19 (LTFRB Integration)
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES
('050', 'LTFRB integration with driver and vehicle compliance', NOW());

-- =====================================================
-- 1. LTFRB DRIVER VERIFICATION TABLE
-- =====================================================
-- Track driver verification status against LTFRB database
CREATE TABLE ltfrb_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Driver Reference
    driver_id UUID NOT NULL UNIQUE,

    -- License Details
    license_number VARCHAR(50) NOT NULL,
    license_type TEXT CHECK (license_type IN (
        'professional',         -- Professional driver's license (required)
        'non_professional',     -- Non-professional (not allowed for TNVS)
        'student_permit',       -- Student permit (not allowed)
        'conductor'             -- Conductor license
    )) NOT NULL,

    -- LTFRB-Specific Details
    ltfrb_driver_id VARCHAR(100), -- LTFRB's internal driver ID
    tnvs_accreditation_number VARCHAR(100), -- TNVS driver accreditation

    -- Verification Status
    verification_status TEXT CHECK (verification_status IN (
        'pending',          -- Waiting for verification
        'verified',         -- Verified against LTFRB database
        'expired',          -- License/accreditation expired
        'suspended',        -- Driver suspended by LTFRB
        'revoked',          -- License/accreditation revoked
        'unverified'        -- Could not verify with LTFRB
    )) DEFAULT 'pending',

    -- Verification Details
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    verification_method TEXT CHECK (verification_method IN (
        'api',              -- Verified via LTFRB API
        'manual',           -- Manual verification
        'document_upload',  -- Document verification
        'third_party'       -- Third-party verification service
    )),

    -- License Validity
    license_issue_date DATE,
    license_expiry_date DATE NOT NULL,
    accreditation_expiry_date DATE,

    -- Restrictions
    license_restrictions JSONB DEFAULT '[]',
    -- Example: ["corrective_lenses", "daylight_only", "automatic_only"]

    driving_record_violations INTEGER DEFAULT 0,
    last_violation_date DATE,

    -- LTFRB Requirements
    has_valid_professional_license BOOLEAN DEFAULT false,
    has_tnvs_accreditation BOOLEAN DEFAULT false,
    has_clean_driving_record BOOLEAN DEFAULT true,
    meets_age_requirement BOOLEAN DEFAULT false, -- 21+ years old

    -- Document Tracking
    license_front_url VARCHAR(500),
    license_back_url VARCHAR(500),
    accreditation_document_url VARCHAR(500),
    nbi_clearance_url VARCHAR(500),
    medical_certificate_url VARCHAR(500),

    -- Document Expiry Reminders
    expiry_reminder_sent BOOLEAN DEFAULT false,
    expiry_reminder_sent_at TIMESTAMP WITH TIME ZONE,

    -- Compliance Status
    ltfrb_compliant BOOLEAN DEFAULT false,
    compliance_issues JSONB DEFAULT '[]',
    -- Example: [{"issue": "license_expired", "severity": "critical", "detected_at": "..."}]

    -- Last Sync with LTFRB
    last_ltfrb_sync TIMESTAMP WITH TIME ZONE,
    ltfrb_sync_status TEXT,
    ltfrb_sync_error TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ltfrb_drivers_driver ON ltfrb_drivers(driver_id);
CREATE INDEX idx_ltfrb_drivers_license ON ltfrb_drivers(license_number);
CREATE INDEX idx_ltfrb_drivers_status ON ltfrb_drivers(verification_status);
CREATE INDEX idx_ltfrb_drivers_compliance ON ltfrb_drivers(ltfrb_compliant);
CREATE INDEX idx_ltfrb_drivers_expiry ON ltfrb_drivers(license_expiry_date);
CREATE INDEX idx_ltfrb_drivers_accreditation ON ltfrb_drivers(tnvs_accreditation_number);

COMMENT ON TABLE ltfrb_drivers IS 'LTFRB driver verification and compliance tracking';

-- =====================================================
-- 2. LTFRB VEHICLE FRANCHISE TABLE
-- =====================================================
-- Track vehicle franchise status and compliance
CREATE TABLE ltfrb_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vehicle Reference
    vehicle_id UUID NOT NULL UNIQUE,

    -- Vehicle Identification
    plate_number VARCHAR(20) NOT NULL,
    chassis_number VARCHAR(50),
    engine_number VARCHAR(50),

    -- LTFRB Franchise Details
    franchise_number VARCHAR(100),
    franchise_type TEXT CHECK (franchise_type IN (
        'tnvs',             -- Transport Network Vehicle Service
        'taxi',             -- Traditional taxi
        'puv',              -- Public Utility Vehicle
        'none'              -- No franchise (not allowed for operation)
    )),

    ltfrb_case_number VARCHAR(100), -- LTFRB case number for franchise

    -- Franchise Status
    franchise_status TEXT CHECK (franchise_status IN (
        'pending',          -- Application pending
        'approved',         -- Franchise approved
        'expired',          -- Franchise expired
        'suspended',        -- Franchise suspended
        'revoked',          -- Franchise revoked
        'none'              -- No franchise
    )) DEFAULT 'pending',

    -- Franchise Validity
    franchise_issue_date DATE,
    franchise_expiry_date DATE,

    -- Vehicle Requirements
    vehicle_type TEXT CHECK (vehicle_type IN (
        'sedan',
        'suv',
        'van',
        'hatchback'
    )),

    year_model INTEGER,
    vehicle_age_years INTEGER,

    -- LTFRB Requirements Compliance
    meets_age_requirement BOOLEAN DEFAULT false,        -- Max 7 years old for TNVS
    meets_emission_standards BOOLEAN DEFAULT false,     -- Must pass emission test
    has_valid_or_cr BOOLEAN DEFAULT false,              -- Official Receipt / Certificate of Registration
    has_comprehensive_insurance BOOLEAN DEFAULT false,  -- Required insurance
    has_ltfrb_sticker BOOLEAN DEFAULT false,            -- LTFRB TNVS sticker

    -- Verification Status
    verification_status TEXT CHECK (verification_status IN (
        'pending',
        'verified',
        'expired',
        'rejected'
    )) DEFAULT 'pending',

    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,

    -- Document Tracking
    or_cr_document_url VARCHAR(500),
    franchise_certificate_url VARCHAR(500),
    emission_test_url VARCHAR(500),
    insurance_policy_url VARCHAR(500),

    or_cr_expiry_date DATE,
    emission_test_expiry_date DATE,
    insurance_expiry_date DATE,

    -- Compliance Status
    ltfrb_compliant BOOLEAN DEFAULT false,
    compliance_issues JSONB DEFAULT '[]',

    -- Expiry Reminders
    franchise_reminder_sent BOOLEAN DEFAULT false,
    or_cr_reminder_sent BOOLEAN DEFAULT false,
    emission_reminder_sent BOOLEAN DEFAULT false,
    insurance_reminder_sent BOOLEAN DEFAULT false,

    -- Last Sync with LTFRB
    last_ltfrb_sync TIMESTAMP WITH TIME ZONE,
    ltfrb_sync_status TEXT,
    ltfrb_sync_error TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ltfrb_vehicles_vehicle ON ltfrb_vehicles(vehicle_id);
CREATE INDEX idx_ltfrb_vehicles_plate ON ltfrb_vehicles(plate_number);
CREATE INDEX idx_ltfrb_vehicles_franchise ON ltfrb_vehicles(franchise_number);
CREATE INDEX idx_ltfrb_vehicles_status ON ltfrb_vehicles(franchise_status);
CREATE INDEX idx_ltfrb_vehicles_compliance ON ltfrb_vehicles(ltfrb_compliant);
CREATE INDEX idx_ltfrb_vehicles_expiry ON ltfrb_vehicles(franchise_expiry_date);

COMMENT ON TABLE ltfrb_vehicles IS 'LTFRB vehicle franchise verification and compliance tracking';

-- =====================================================
-- 3. LTFRB TRIP REPORTS TABLE
-- =====================================================
-- Daily trip reporting for LTFRB compliance
CREATE TABLE ltfrb_trip_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Trip Reference
    ride_id UUID NOT NULL,
    trip_number VARCHAR(50),

    -- Trip Details
    trip_date DATE NOT NULL,
    trip_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    trip_end_time TIMESTAMP WITH TIME ZONE,
    trip_duration_minutes INTEGER,

    -- Driver & Vehicle
    driver_id UUID NOT NULL,
    driver_name VARCHAR(200),
    license_number VARCHAR(50),

    vehicle_id UUID NOT NULL,
    plate_number VARCHAR(20) NOT NULL,
    franchise_number VARCHAR(100),

    -- Trip Route
    pickup_address TEXT,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    pickup_city VARCHAR(100),

    dropoff_address TEXT,
    dropoff_latitude DECIMAL(10, 8),
    dropoff_longitude DECIMAL(11, 8),
    dropoff_city VARCHAR(100),

    distance_km DECIMAL(8, 2),

    -- Passenger
    passenger_id UUID NOT NULL,
    passenger_name VARCHAR(200),
    passenger_phone VARCHAR(20),

    -- Fare Details
    base_fare DECIMAL(10, 2),
    distance_fare DECIMAL(10, 2),
    time_fare DECIMAL(10, 2),
    surge_multiplier DECIMAL(5, 2) DEFAULT 1.0,
    total_fare DECIMAL(10, 2) NOT NULL,
    payment_method TEXT,

    -- Trip Status
    trip_status TEXT CHECK (trip_status IN (
        'completed',
        'cancelled',
        'no_show',
        'disputed'
    )) NOT NULL,

    cancellation_reason TEXT,

    -- LTFRB Reporting
    reported_to_ltfrb BOOLEAN DEFAULT false,
    ltfrb_report_id VARCHAR(100),
    reported_at TIMESTAMP WITH TIME ZONE,
    report_batch_id VARCHAR(100),

    -- Compliance Flags
    exceeds_fare_ceiling BOOLEAN DEFAULT false,
    surge_applied BOOLEAN DEFAULT false,
    off_peak_hours BOOLEAN DEFAULT false,

    -- Incidents
    has_incident BOOLEAN DEFAULT false,
    incident_type TEXT,
    incident_description TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ltfrb_trips_ride ON ltfrb_trip_reports(ride_id);
CREATE INDEX idx_ltfrb_trips_date ON ltfrb_trip_reports(trip_date DESC);
CREATE INDEX idx_ltfrb_trips_driver ON ltfrb_trip_reports(driver_id, trip_date);
CREATE INDEX idx_ltfrb_trips_vehicle ON ltfrb_trip_reports(vehicle_id, trip_date);
CREATE INDEX idx_ltfrb_trips_status ON ltfrb_trip_reports(trip_status);
CREATE INDEX idx_ltfrb_trips_reported ON ltfrb_trip_reports(reported_to_ltfrb, trip_date);
CREATE INDEX idx_ltfrb_trips_batch ON ltfrb_trip_reports(report_batch_id);

COMMENT ON TABLE ltfrb_trip_reports IS 'Trip data for LTFRB daily reporting requirements';

-- =====================================================
-- 4. LTFRB DOCUMENTS TABLE
-- =====================================================
-- Track all LTFRB-related documents
CREATE TABLE ltfrb_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Document Identification
    document_type TEXT CHECK (document_type IN (
        'driver_license',
        'tnvs_accreditation',
        'nbi_clearance',
        'medical_certificate',
        'vehicle_or_cr',
        'franchise_certificate',
        'emission_test',
        'insurance_policy',
        'ltfrb_sticker',
        'training_certificate',
        'other'
    )) NOT NULL,

    -- Entity Reference
    entity_type TEXT CHECK (entity_type IN ('driver', 'vehicle')) NOT NULL,
    driver_id UUID,
    vehicle_id UUID,

    -- Document Details
    document_number VARCHAR(100),
    issuing_authority VARCHAR(200),
    issue_date DATE,
    expiry_date DATE,

    -- File Storage
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    file_hash VARCHAR(64), -- SHA-256 for integrity
    mime_type VARCHAR(100),

    -- Verification
    verification_status TEXT CHECK (verification_status IN (
        'pending',
        'verified',
        'rejected',
        'expired'
    )) DEFAULT 'pending',

    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Compliance
    is_compliant BOOLEAN DEFAULT false,
    compliance_notes TEXT,

    -- Version Control
    version INTEGER DEFAULT 1,
    replaces_document_id UUID,

    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ltfrb_docs_type ON ltfrb_documents(document_type);
CREATE INDEX idx_ltfrb_docs_driver ON ltfrb_documents(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_ltfrb_docs_vehicle ON ltfrb_documents(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX idx_ltfrb_docs_status ON ltfrb_documents(verification_status);
CREATE INDEX idx_ltfrb_docs_expiry ON ltfrb_documents(expiry_date) WHERE expiry_date IS NOT NULL;

COMMENT ON TABLE ltfrb_documents IS 'Document storage and verification for LTFRB compliance';

-- =====================================================
-- 5. LTFRB REPORT SUBMISSIONS TABLE
-- =====================================================
-- Track LTFRB report submissions
CREATE TABLE ltfrb_report_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Report Identification
    report_id VARCHAR(100) UNIQUE NOT NULL,
    report_type TEXT CHECK (report_type IN (
        'daily_trips',          -- Daily trip report
        'weekly_summary',       -- Weekly summary
        'monthly_reconciliation',-- Monthly reconciliation
        'quarterly_summary',    -- Quarterly summary
        'incident_report',      -- Incident/accident report
        'compliance_report'     -- Compliance status report
    )) NOT NULL,

    -- Report Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    reporting_year INTEGER NOT NULL,
    reporting_month INTEGER CHECK (reporting_month >= 1 AND reporting_month <= 12),

    -- Report Content Summary
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    total_distance_km DECIMAL(12, 2) DEFAULT 0,
    total_fare_amount DECIMAL(15, 2) DEFAULT 0,

    unique_drivers INTEGER DEFAULT 0,
    unique_vehicles INTEGER DEFAULT 0,
    unique_passengers INTEGER DEFAULT 0,

    incidents_count INTEGER DEFAULT 0,
    compliance_violations INTEGER DEFAULT 0,

    -- File Details
    file_path VARCHAR(500),
    file_format TEXT CHECK (file_format IN ('csv', 'xlsx', 'pdf', 'xml')) DEFAULT 'csv',
    file_size_bytes BIGINT,
    file_hash VARCHAR(64),

    -- Submission Status
    status TEXT CHECK (status IN (
        'draft',
        'generated',
        'validated',
        'submitted',
        'acknowledged',
        'rejected',
        'resubmitted'
    )) DEFAULT 'draft',

    -- LTFRB Tracking
    ltfrb_reference_number VARCHAR(100),
    ltfrb_acknowledgment_date TIMESTAMP WITH TIME ZONE,
    ltfrb_notes TEXT,

    -- Metadata
    generated_by UUID NOT NULL,
    submitted_by UUID,
    validated_by UUID,

    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ltfrb_reports_id ON ltfrb_report_submissions(report_id);
CREATE INDEX idx_ltfrb_reports_type ON ltfrb_report_submissions(report_type, period_start);
CREATE INDEX idx_ltfrb_reports_status ON ltfrb_report_submissions(status);
CREATE INDEX idx_ltfrb_reports_period ON ltfrb_report_submissions(period_start DESC, period_end DESC);
CREATE INDEX idx_ltfrb_reports_submitted ON ltfrb_report_submissions(submitted_at DESC);

COMMENT ON TABLE ltfrb_report_submissions IS 'LTFRB report submissions tracking';

-- =====================================================
-- 6. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to check driver LTFRB compliance
CREATE OR REPLACE FUNCTION check_ltfrb_driver_compliance()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if driver meets all LTFRB requirements
    NEW.has_valid_professional_license := (
        NEW.license_type = 'professional' AND
        NEW.license_expiry_date > CURRENT_DATE
    );

    NEW.has_tnvs_accreditation := (
        NEW.tnvs_accreditation_number IS NOT NULL AND
        (NEW.accreditation_expiry_date IS NULL OR NEW.accreditation_expiry_date > CURRENT_DATE)
    );

    -- Overall compliance check
    NEW.ltfrb_compliant := (
        NEW.has_valid_professional_license = true AND
        NEW.has_tnvs_accreditation = true AND
        NEW.has_clean_driving_record = true AND
        NEW.verification_status = 'verified'
    );

    -- Build compliance issues array
    NEW.compliance_issues := '[]'::jsonb;

    IF NOT NEW.has_valid_professional_license THEN
        NEW.compliance_issues := NEW.compliance_issues || jsonb_build_object(
            'issue', 'invalid_professional_license',
            'severity', 'critical',
            'detected_at', NOW()
        );
    END IF;

    IF NOT NEW.has_tnvs_accreditation THEN
        NEW.compliance_issues := NEW.compliance_issues || jsonb_build_object(
            'issue', 'missing_tnvs_accreditation',
            'severity', 'critical',
            'detected_at', NOW()
        );
    END IF;

    IF NOT NEW.has_clean_driving_record THEN
        NEW.compliance_issues := NEW.compliance_issues || jsonb_build_object(
            'issue', 'driving_violations',
            'severity', 'high',
            'detected_at', NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ltfrb_driver_compliance
    BEFORE INSERT OR UPDATE ON ltfrb_drivers
    FOR EACH ROW
    EXECUTE FUNCTION check_ltfrb_driver_compliance();

-- Function to check vehicle LTFRB compliance
CREATE OR REPLACE FUNCTION check_ltfrb_vehicle_compliance()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate vehicle age
    IF NEW.year_model IS NOT NULL THEN
        NEW.vehicle_age_years := EXTRACT(YEAR FROM CURRENT_DATE) - NEW.year_model;
    END IF;

    -- Check age requirement (max 7 years for TNVS)
    NEW.meets_age_requirement := (
        NEW.vehicle_age_years IS NOT NULL AND
        NEW.vehicle_age_years <= 7
    );

    -- Check document validity
    NEW.has_valid_or_cr := (
        NEW.or_cr_expiry_date IS NOT NULL AND
        NEW.or_cr_expiry_date > CURRENT_DATE
    );

    -- Overall compliance check
    NEW.ltfrb_compliant := (
        NEW.franchise_status = 'approved' AND
        NEW.meets_age_requirement = true AND
        NEW.meets_emission_standards = true AND
        NEW.has_valid_or_cr = true AND
        NEW.has_comprehensive_insurance = true AND
        NEW.verification_status = 'verified'
    );

    -- Build compliance issues array
    NEW.compliance_issues := '[]'::jsonb;

    IF NEW.franchise_status != 'approved' THEN
        NEW.compliance_issues := NEW.compliance_issues || jsonb_build_object(
            'issue', 'no_valid_franchise',
            'severity', 'critical',
            'detected_at', NOW()
        );
    END IF;

    IF NOT NEW.meets_age_requirement THEN
        NEW.compliance_issues := NEW.compliance_issues || jsonb_build_object(
            'issue', 'vehicle_too_old',
            'severity', 'critical',
            'detected_at', NOW()
        );
    END IF;

    IF NOT NEW.has_comprehensive_insurance THEN
        NEW.compliance_issues := NEW.compliance_issues || jsonb_build_object(
            'issue', 'missing_insurance',
            'severity', 'critical',
            'detected_at', NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ltfrb_vehicle_compliance
    BEFORE INSERT OR UPDATE ON ltfrb_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION check_ltfrb_vehicle_compliance();

-- Update updated_at timestamp triggers
CREATE TRIGGER trigger_ltfrb_drivers_updated_at
    BEFORE UPDATE ON ltfrb_drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_ltfrb_vehicles_updated_at
    BEFORE UPDATE ON ltfrb_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_ltfrb_trips_updated_at
    BEFORE UPDATE ON ltfrb_trip_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_ltfrb_docs_updated_at
    BEFORE UPDATE ON ltfrb_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_ltfrb_reports_updated_at
    BEFORE UPDATE ON ltfrb_report_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_updated_at();

-- =====================================================
-- 7. MATERIALIZED VIEWS FOR REPORTING
-- =====================================================

-- LTFRB Compliance Dashboard
CREATE MATERIALIZED VIEW ltfrb_compliance_dashboard AS
SELECT
    'driver' as entity_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE ltfrb_compliant = true) as compliant_count,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_count,
    COUNT(*) FILTER (WHERE license_expiry_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon_count,
    COUNT(*) FILTER (WHERE license_expiry_date < CURRENT_DATE) as expired_count
FROM ltfrb_drivers

UNION ALL

SELECT
    'vehicle' as entity_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE ltfrb_compliant = true) as compliant_count,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_count,
    COUNT(*) FILTER (WHERE franchise_expiry_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon_count,
    COUNT(*) FILTER (WHERE franchise_expiry_date < CURRENT_DATE) as expired_count
FROM ltfrb_vehicles;

-- Daily Trip Summary
CREATE MATERIALIZED VIEW ltfrb_daily_trip_summary AS
SELECT
    trip_date,
    COUNT(*) as total_trips,
    COUNT(*) FILTER (WHERE trip_status = 'completed') as completed_trips,
    COUNT(*) FILTER (WHERE trip_status = 'cancelled') as cancelled_trips,
    SUM(distance_km) as total_distance_km,
    SUM(total_fare) as total_fare_amount,
    AVG(total_fare) as average_fare,
    COUNT(DISTINCT driver_id) as unique_drivers,
    COUNT(DISTINCT vehicle_id) as unique_vehicles,
    COUNT(DISTINCT passenger_id) as unique_passengers,
    COUNT(*) FILTER (WHERE reported_to_ltfrb = true) as reported_count
FROM ltfrb_trip_reports
WHERE trip_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY trip_date
ORDER BY trip_date DESC;

CREATE INDEX idx_ltfrb_daily_summary_date ON ltfrb_daily_trip_summary(trip_date DESC);

-- =====================================================
-- 8. ROW-LEVEL SECURITY
-- =====================================================

ALTER TABLE ltfrb_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ltfrb_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ltfrb_trip_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ltfrb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ltfrb_report_submissions ENABLE ROW LEVEL SECURITY;

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
        'ltfrb_drivers',
        'ltfrb_vehicles',
        'ltfrb_trip_reports',
        'ltfrb_documents',
        'ltfrb_report_submissions'
    )
ORDER BY table_name;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MIGRATION 050: LTFRB Integration - COMPLETE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - ltfrb_drivers (Driver verification)';
    RAISE NOTICE '  - ltfrb_vehicles (Vehicle franchise validation)';
    RAISE NOTICE '  - ltfrb_trip_reports (Trip reporting)';
    RAISE NOTICE '  - ltfrb_documents (Document management)';
    RAISE NOTICE '  - ltfrb_report_submissions (Report tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Professional license verification';
    RAISE NOTICE '  - TNVS accreditation tracking';
    RAISE NOTICE '  - Vehicle franchise validation';
    RAISE NOTICE '  - Automated compliance checking';
    RAISE NOTICE '  - Daily/weekly/monthly trip reporting';
    RAISE NOTICE '  - Document expiry tracking';
    RAISE NOTICE '  - 7-year vehicle age requirement';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Implement LTFRB driver verification service';
    RAISE NOTICE '  2. Implement vehicle franchise service';
    RAISE NOTICE '  3. Implement trip reporting service';
    RAISE NOTICE '  4. Create LTFRB API endpoints';
    RAISE NOTICE '  5. Build LTFRB compliance dashboard';
    RAISE NOTICE '=====================================================';
END $$;
