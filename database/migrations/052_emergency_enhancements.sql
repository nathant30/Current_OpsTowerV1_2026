-- =====================================================
-- Emergency System Enhancements - Issue #12
-- Multi-channel alerts, emergency contacts, location tracking
-- =====================================================

-- Emergency Contact Types Enum
CREATE TYPE emergency_contact_relationship AS ENUM (
    'spouse',
    'parent',
    'child',
    'sibling',
    'friend',
    'coworker',
    'other'
);

-- Emergency Contacts Table
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('driver', 'passenger')),

    -- Contact Information
    name VARCHAR(100) NOT NULL,
    relationship emergency_contact_relationship NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    alternative_phone VARCHAR(20),

    -- Priority (1=primary, 2=secondary, 3=tertiary)
    priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 3),

    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(10),
    verification_sent_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(50), -- 'sms', 'email', 'phone_call'

    -- Contact Preferences
    notify_via_sms BOOLEAN DEFAULT TRUE,
    notify_via_email BOOLEAN DEFAULT TRUE,
    notify_via_phone_call BOOLEAN DEFAULT FALSE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMP WITH TIME ZONE,
    notification_count INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,

    -- Constraints
    UNIQUE(user_id, user_type, priority),
    CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Emergency Contact Notifications Log
CREATE TABLE emergency_contact_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_contact_id UUID NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,
    sos_alert_id UUID NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,

    -- Notification Details
    notification_type VARCHAR(20) NOT NULL, -- 'sms', 'email', 'phone_call', 'push'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'

    -- Message Content
    subject VARCHAR(200),
    message TEXT NOT NULL,

    -- Delivery Tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,

    -- Response Tracking
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    response_message TEXT,

    -- Provider Details
    provider VARCHAR(50), -- 'twilio', 'sendgrid', 'firebase', etc.
    provider_message_id VARCHAR(255),
    cost DECIMAL(8,4), -- Cost of sending notification

    -- Retry Tracking
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Location Trail (Breadcrumb tracking)
CREATE TABLE emergency_location_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_alert_id UUID NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,

    -- Location Information
    location GEOMETRY(POINT, 4326) NOT NULL,
    accuracy DECIMAL(8,2), -- GPS accuracy in meters
    altitude DECIMAL(10,2), -- Altitude in meters
    speed DECIMAL(8,2), -- Speed in km/h
    heading DECIMAL(5,2), -- Direction in degrees (0-360)

    -- Address Geocoding
    address TEXT,
    street VARCHAR(255),
    barangay VARCHAR(100),
    city VARCHAR(100),
    province VARCHAR(100),

    -- Context
    location_source VARCHAR(20) NOT NULL, -- 'gps', 'network', 'wifi', 'manual'
    battery_level INTEGER, -- Battery percentage
    is_moving BOOLEAN DEFAULT FALSE,

    -- Geofence Alerts
    geofence_breached BOOLEAN DEFAULT FALSE,
    geofence_name VARCHAR(100),
    geofence_alert_sent BOOLEAN DEFAULT FALSE,

    -- Timing
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexing for performance
    INDEX idx_location_trail_sos ON emergency_location_trail(sos_alert_id, recorded_at DESC)
);

-- Emergency Notification Channels Table
CREATE TABLE emergency_notification_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_alert_id UUID NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,

    -- Channel Information
    channel_type VARCHAR(20) NOT NULL, -- 'sms', 'email', 'push', 'in_app', 'phone_call', 'webhook'
    recipient VARCHAR(255) NOT NULL, -- Phone number, email, device token, etc.
    recipient_type VARCHAR(20) NOT NULL, -- 'driver', 'passenger', 'emergency_contact', 'operator', 'authority'
    recipient_id UUID, -- Reference to user or contact

    -- Message Details
    subject VARCHAR(200),
    message TEXT NOT NULL,
    template_id VARCHAR(50),

    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'queued', 'sent', 'delivered', 'read', 'failed'
    priority VARCHAR(20) NOT NULL DEFAULT 'high', -- 'low', 'normal', 'high', 'critical'

    -- Timing
    queued_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,

    -- Escalation
    requires_escalation BOOLEAN DEFAULT FALSE,
    escalation_delay_seconds INTEGER DEFAULT 30,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalation_level INTEGER DEFAULT 0,

    -- Provider Details
    provider VARCHAR(50),
    provider_message_id VARCHAR(255),
    provider_response JSONB,

    -- Acknowledgment
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Geofences Table
CREATE TABLE emergency_geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Geographic Boundary
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    center_point GEOMETRY(POINT, 4326) NOT NULL,
    radius_meters DECIMAL(10,2), -- For circular geofences

    -- Geofence Type
    fence_type VARCHAR(20) NOT NULL, -- 'safe_zone', 'danger_zone', 'restricted', 'hospital', 'police_station'
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    -- Alert Configuration
    alert_on_entry BOOLEAN DEFAULT TRUE,
    alert_on_exit BOOLEAN DEFAULT TRUE,
    alert_message TEXT,
    auto_notify_authorities BOOLEAN DEFAULT FALSE,

    -- Region Association
    region_id UUID REFERENCES regions(id),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Emergency Escalation Rules Table
CREATE TABLE emergency_escalation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Trigger Conditions
    emergency_type sos_emergency_type NOT NULL,
    severity_threshold INTEGER DEFAULT 7, -- Severity level to trigger (1-10)
    no_response_seconds INTEGER DEFAULT 30, -- Seconds without response before escalation

    -- Escalation Actions
    escalation_levels JSONB NOT NULL, -- Array of escalation steps with delays
    -- Example: [
    --   {"level": 1, "delay_seconds": 30, "actions": ["notify_supervisor", "send_sms"]},
    --   {"level": 2, "delay_seconds": 60, "actions": ["call_authorities", "alert_all_operators"]},
    --   {"level": 3, "delay_seconds": 120, "actions": ["notify_emergency_contacts", "dispatch_help"]}
    -- ]

    -- Notification Templates
    sms_template VARCHAR(500),
    email_template TEXT,
    push_template VARCHAR(255),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1, -- Rule priority (lower = higher priority)

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,

    UNIQUE(rule_name)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Emergency Contacts
CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id, user_type) WHERE is_active = TRUE;
CREATE INDEX idx_emergency_contacts_verification ON emergency_contacts(is_verified, verification_sent_at) WHERE NOT is_verified;
CREATE INDEX idx_emergency_contacts_priority ON emergency_contacts(user_id, user_type, priority) WHERE is_active = TRUE;

-- Emergency Contact Notifications
CREATE INDEX idx_contact_notifications_sos ON emergency_contact_notifications(sos_alert_id, created_at DESC);
CREATE INDEX idx_contact_notifications_contact ON emergency_contact_notifications(emergency_contact_id, status);
CREATE INDEX idx_contact_notifications_status ON emergency_contact_notifications(status, next_retry_at) WHERE status = 'pending';
CREATE INDEX idx_contact_notifications_delivery ON emergency_contact_notifications(sent_at, delivered_at) WHERE delivered_at IS NOT NULL;

-- Emergency Location Trail
CREATE INDEX idx_location_trail_sos_time ON emergency_location_trail(sos_alert_id, recorded_at DESC);
CREATE INDEX idx_location_trail_location ON emergency_location_trail USING GIST(location);
CREATE INDEX idx_location_trail_geofence ON emergency_location_trail(geofence_breached, geofence_alert_sent) WHERE geofence_breached = TRUE;

-- Emergency Notification Channels
CREATE INDEX idx_notification_channels_sos ON emergency_notification_channels(sos_alert_id, status);
CREATE INDEX idx_notification_channels_status ON emergency_notification_channels(status, priority) WHERE status IN ('pending', 'queued');
CREATE INDEX idx_notification_channels_escalation ON emergency_notification_channels(requires_escalation, escalated_at) WHERE requires_escalation = TRUE AND escalated_at IS NULL;
CREATE INDEX idx_notification_channels_recipient ON emergency_notification_channels(recipient_type, recipient_id, status);

-- Emergency Geofences
CREATE INDEX idx_geofences_boundary ON emergency_geofences USING GIST(boundary) WHERE is_active = TRUE;
CREATE INDEX idx_geofences_center ON emergency_geofences USING GIST(center_point) WHERE is_active = TRUE;
CREATE INDEX idx_geofences_region ON emergency_geofences(region_id, is_active);
CREATE INDEX idx_geofences_type ON emergency_geofences(fence_type, is_active) WHERE is_active = TRUE;

-- Emergency Escalation Rules
CREATE INDEX idx_escalation_rules_type ON emergency_escalation_rules(emergency_type, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_escalation_rules_priority ON emergency_escalation_rules(priority, is_active) WHERE is_active = TRUE;

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to check geofence breaches
CREATE OR REPLACE FUNCTION check_emergency_geofence_breach()
RETURNS TRIGGER AS $$
DECLARE
    breached_fence RECORD;
BEGIN
    -- Check if location breaches any active geofences
    FOR breached_fence IN
        SELECT id, name, fence_type, alert_message, auto_notify_authorities
        FROM emergency_geofences
        WHERE is_active = TRUE
        AND ST_Contains(boundary, NEW.location)
    LOOP
        -- Mark geofence breach
        NEW.geofence_breached := TRUE;
        NEW.geofence_name := breached_fence.name;

        -- Create alert if not already sent
        IF NOT NEW.geofence_alert_sent THEN
            INSERT INTO emergency_notification_channels (
                sos_alert_id,
                channel_type,
                recipient,
                recipient_type,
                message,
                status,
                priority
            ) VALUES (
                NEW.sos_alert_id,
                'in_app',
                'all_operators',
                'operator',
                format('GEOFENCE ALERT: SOS entered %s (%s). %s',
                    breached_fence.name,
                    breached_fence.fence_type,
                    COALESCE(breached_fence.alert_message, 'Immediate attention required.')
                ),
                'pending',
                'critical'
            );

            NEW.geofence_alert_sent := TRUE;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for geofence checking
CREATE TRIGGER tr_check_geofence_breach
    BEFORE INSERT ON emergency_location_trail
    FOR EACH ROW
    EXECUTE FUNCTION check_emergency_geofence_breach();

-- Function to handle notification escalation
CREATE OR REPLACE FUNCTION handle_notification_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- If notification requires escalation and enough time has passed
    IF NEW.requires_escalation AND
       OLD.escalated_at IS NULL AND
       NEW.status = 'sent' AND
       NOW() > (NEW.sent_at + (NEW.escalation_delay_seconds || ' seconds')::INTERVAL) THEN

        NEW.escalated_at := NOW();
        NEW.escalation_level := OLD.escalation_level + 1;

        -- Create escalated notification
        INSERT INTO emergency_notification_channels (
            sos_alert_id,
            channel_type,
            recipient,
            recipient_type,
            message,
            status,
            priority,
            escalation_level
        ) VALUES (
            NEW.sos_alert_id,
            'phone_call', -- Escalate to phone call
            NEW.recipient,
            NEW.recipient_type,
            'ESCALATED: ' || NEW.message,
            'pending',
            'critical',
            NEW.escalation_level
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification escalation
CREATE TRIGGER tr_notification_escalation
    BEFORE UPDATE ON emergency_notification_channels
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR
          OLD.escalated_at IS DISTINCT FROM NEW.escalated_at)
    EXECUTE FUNCTION handle_notification_escalation();

-- Function to auto-notify emergency contacts on SOS trigger
CREATE OR REPLACE FUNCTION notify_emergency_contacts_on_sos()
RETURNS TRIGGER AS $$
DECLARE
    contact RECORD;
BEGIN
    -- Get all active emergency contacts for the reporter
    FOR contact IN
        SELECT ec.*, sa.sos_code, sa.emergency_type, sa.location, sa.description
        FROM emergency_contacts ec
        CROSS JOIN sos_alerts sa
        WHERE ec.user_id = NEW.reporter_id
        AND ec.user_type = NEW.reporter_type
        AND ec.is_active = TRUE
        AND ec.is_verified = TRUE
        AND sa.id = NEW.id
        ORDER BY ec.priority ASC
    LOOP
        -- Create SMS notification if enabled
        IF contact.notify_via_sms THEN
            INSERT INTO emergency_contact_notifications (
                emergency_contact_id,
                sos_alert_id,
                notification_type,
                message,
                status
            ) VALUES (
                contact.id,
                NEW.id,
                'sms',
                format('EMERGENCY ALERT: %s has triggered SOS (Code: %s). Type: %s. Location: %s. Please respond immediately.',
                    NEW.reporter_name,
                    contact.sos_code,
                    contact.emergency_type,
                    COALESCE(NEW.address, 'Unknown location')
                ),
                'pending'
            );
        END IF;

        -- Create email notification if enabled
        IF contact.notify_via_email AND contact.email IS NOT NULL THEN
            INSERT INTO emergency_contact_notifications (
                emergency_contact_id,
                sos_alert_id,
                notification_type,
                subject,
                message,
                status
            ) VALUES (
                contact.id,
                NEW.id,
                'email',
                format('EMERGENCY: SOS Alert from %s', NEW.reporter_name),
                format('An emergency SOS has been triggered.\n\nPerson: %s\nSOS Code: %s\nEmergency Type: %s\nLocation: %s\nDescription: %s\n\nEmergency services have been notified. This is an automated alert from OpsTower Emergency System.',
                    NEW.reporter_name,
                    contact.sos_code,
                    contact.emergency_type,
                    COALESCE(NEW.address, 'Unknown location'),
                    COALESCE(contact.description, 'No description provided')
                ),
                'pending'
            );
        END IF;

        -- Update contact last notified timestamp
        UPDATE emergency_contacts
        SET last_notified_at = NOW(), notification_count = notification_count + 1
        WHERE id = contact.id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-notify emergency contacts when SOS is triggered
CREATE TRIGGER tr_notify_emergency_contacts
    AFTER INSERT ON sos_alerts
    FOR EACH ROW
    EXECUTE FUNCTION notify_emergency_contacts_on_sos();

-- Apply updated_at triggers
CREATE TRIGGER tr_emergency_contacts_updated_at
    BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_emergency_notification_channels_updated_at
    BEFORE UPDATE ON emergency_notification_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_emergency_geofences_updated_at
    BEFORE UPDATE ON emergency_geofences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_emergency_escalation_rules_updated_at
    BEFORE UPDATE ON emergency_escalation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- VIEWS FOR DASHBOARD
-- =====================================================

-- Active Emergency Contacts View
CREATE VIEW v_active_emergency_contacts AS
SELECT
    ec.id,
    ec.user_id,
    ec.user_type,
    ec.name,
    ec.relationship,
    ec.phone,
    ec.email,
    ec.priority,
    ec.is_verified,
    ec.notify_via_sms,
    ec.notify_via_email,
    ec.notify_via_phone_call,
    ec.last_notified_at,
    ec.notification_count,
    CASE ec.priority
        WHEN 1 THEN 'Primary'
        WHEN 2 THEN 'Secondary'
        WHEN 3 THEN 'Tertiary'
    END as priority_label
FROM emergency_contacts ec
WHERE ec.is_active = TRUE
ORDER BY ec.user_id, ec.user_type, ec.priority;

-- Emergency Location Trail Summary View
CREATE VIEW v_emergency_location_trail_summary AS
SELECT
    elt.sos_alert_id,
    COUNT(*) as total_locations,
    MIN(elt.recorded_at) as first_location_at,
    MAX(elt.recorded_at) as last_location_at,
    EXTRACT(EPOCH FROM (MAX(elt.recorded_at) - MIN(elt.recorded_at))) as duration_seconds,
    AVG(elt.speed) as avg_speed_kmh,
    MAX(elt.speed) as max_speed_kmh,
    COUNT(CASE WHEN elt.geofence_breached THEN 1 END) as geofence_breaches,
    AVG(elt.accuracy) as avg_accuracy_meters,
    jsonb_agg(
        jsonb_build_object(
            'location', ST_AsGeoJSON(elt.location)::jsonb,
            'recorded_at', elt.recorded_at,
            'speed', elt.speed,
            'address', elt.address
        ) ORDER BY elt.recorded_at DESC
    ) FILTER (WHERE elt.recorded_at >= NOW() - INTERVAL '30 minutes') as recent_locations
FROM emergency_location_trail elt
GROUP BY elt.sos_alert_id;

-- Emergency Notification Performance View
CREATE VIEW v_emergency_notification_performance AS
SELECT
    enc.sos_alert_id,
    enc.channel_type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN enc.status = 'sent' OR enc.status = 'delivered' THEN 1 END) as successful,
    COUNT(CASE WHEN enc.status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN enc.acknowledged THEN 1 END) as acknowledged,
    AVG(EXTRACT(EPOCH FROM (enc.sent_at - enc.created_at))) as avg_send_delay_seconds,
    AVG(EXTRACT(EPOCH FROM (enc.delivered_at - enc.sent_at))) FILTER (WHERE enc.delivered_at IS NOT NULL) as avg_delivery_time_seconds,
    AVG(EXTRACT(EPOCH FROM (enc.acknowledged_at - enc.sent_at))) FILTER (WHERE enc.acknowledged_at IS NOT NULL) as avg_acknowledgment_time_seconds,
    COUNT(CASE WHEN enc.requires_escalation THEN 1 END) as escalations_required,
    COUNT(CASE WHEN enc.escalated_at IS NOT NULL THEN 1 END) as escalations_completed
FROM emergency_notification_channels enc
GROUP BY enc.sos_alert_id, enc.channel_type;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE emergency_contacts IS 'Emergency contact management for drivers and passengers (max 3 each)';
COMMENT ON TABLE emergency_contact_notifications IS 'Notification log for emergency contact alerts during SOS events';
COMMENT ON TABLE emergency_location_trail IS 'Real-time location breadcrumb trail during emergency situations';
COMMENT ON TABLE emergency_notification_channels IS 'Multi-channel notification tracking for emergency alerts';
COMMENT ON TABLE emergency_geofences IS 'Geographic boundaries for emergency alerts and restricted zones';
COMMENT ON TABLE emergency_escalation_rules IS 'Automated escalation rules for unacknowledged emergencies';

COMMENT ON VIEW v_active_emergency_contacts IS 'Active verified emergency contacts for quick access';
COMMENT ON VIEW v_emergency_location_trail_summary IS 'Summary statistics and recent locations for emergency tracking';
COMMENT ON VIEW v_emergency_notification_performance IS 'Performance metrics for emergency notification delivery';

-- Grant necessary permissions
GRANT SELECT ON v_active_emergency_contacts TO readonly_role;
GRANT SELECT ON v_emergency_location_trail_summary TO readonly_role;
GRANT SELECT ON v_emergency_notification_performance TO readonly_role;
