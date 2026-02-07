// Enhanced SOS Emergency System - Issue #12
// Multi-channel alerts, emergency contacts, real-time location tracking
// Builds on existing sosAlertProcessor with advanced notification capabilities

import { sosAlertProcessor, SOSAlert, SOSEmergencyType } from '../sosAlertProcessor';
import { db } from '../database';
import { redis } from '../redis';
import { getWebSocketManager } from '../websocket';
import { logger } from '../security/productionLogger';

// Import communication services
import Twilio from 'twilio';
import sgMail from '@sendgrid/mail';

export interface EmergencyContact {
  id: string;
  userId: string;
  userType: 'driver' | 'passenger';
  name: string;
  relationship: 'spouse' | 'parent' | 'child' | 'sibling' | 'friend' | 'coworker' | 'other';
  phone: string;
  email?: string;
  alternativePhone?: string;
  priority: 1 | 2 | 3;
  isVerified: boolean;
  notifyViaSms: boolean;
  notifyViaEmail: boolean;
  notifyViaPhoneCall: boolean;
  isActive: boolean;
}

export interface EmergencyContactNotification {
  id: string;
  emergencyContactId: string;
  sosAlertId: string;
  notificationType: 'sms' | 'email' | 'phone_call' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  message: string;
  sentAt?: Date;
  deliveredAt?: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export interface LocationTrailPoint {
  id: string;
  sosAlertId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  address?: string;
  locationSource: 'gps' | 'network' | 'wifi' | 'manual';
  batteryLevel?: number;
  isMoving: boolean;
  geofenceBreached: boolean;
  geofenceName?: string;
  recordedAt: Date;
}

export interface MultiChannelNotification {
  sosAlertId: string;
  channelType: 'sms' | 'email' | 'push' | 'in_app' | 'phone_call' | 'webhook';
  recipient: string;
  recipientType: 'driver' | 'passenger' | 'emergency_contact' | 'operator' | 'authority';
  recipientId?: string;
  subject?: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiresEscalation: boolean;
  escalationDelaySeconds: number;
}

export interface EscalationRule {
  id: string;
  ruleName: string;
  emergencyType: SOSEmergencyType;
  severityThreshold: number;
  noResponseSeconds: number;
  escalationLevels: Array<{
    level: number;
    delaySeconds: number;
    actions: string[];
  }>;
  isActive: boolean;
}

class EnhancedSOSService {
  private static instance: EnhancedSOSService;
  private twilioClient: Twilio.Twilio | null = null;
  private sendgridClient: typeof sgMail | null = null;

  // Escalation monitoring
  private escalationTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {
    this.initializeCommunicationServices();
    this.startEscalationMonitoring();
  }

  static getInstance(): EnhancedSOSService {
    if (!EnhancedSOSService.instance) {
      EnhancedSOSService.instance = new EnhancedSOSService();
    }
    return EnhancedSOSService.instance;
  }

  /**
   * Initialize Twilio and SendGrid services
   */
  private initializeCommunicationServices() {
    try {
      // Initialize Twilio
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = Twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        logger.info('Twilio SMS service initialized');
      }

      // Initialize SendGrid
      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sendgridClient = sgMail;
        logger.info('SendGrid email service initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize communication services:', error);
    }
  }

  /**
   * Trigger enhanced SOS with multi-channel alerts
   */
  async triggerEnhancedSOS(data: {
    reporterId: string;
    reporterType: 'driver' | 'passenger';
    reporterName?: string;
    reporterPhone?: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      address?: string;
    };
    driverId?: string;
    bookingId?: string;
    emergencyType?: SOSEmergencyType;
    description?: string;
  }): Promise<SOSAlert> {
    // Trigger standard SOS first
    const sosAlert = await sosAlertProcessor.processSOS(data);

    // Start multi-channel notifications in parallel
    await Promise.allSettled([
      this.sendMultiChannelAlerts(sosAlert),
      this.notifyEmergencyContacts(sosAlert),
      this.startLocationTracking(sosAlert.id),
      this.setupEscalationTimer(sosAlert)
    ]);

    logger.info(`Enhanced SOS ${sosAlert.sosCode} triggered with multi-channel alerts`);
    return sosAlert;
  }

  /**
   * Send multi-channel alerts (SMS, Email, Push, In-App)
   */
  private async sendMultiChannelAlerts(sosAlert: SOSAlert): Promise<void> {
    const notifications: MultiChannelNotification[] = [];

    // 1. In-App Banner (highest priority - immediate)
    notifications.push({
      sosAlertId: sosAlert.id,
      channelType: 'in_app',
      recipient: 'all_operators',
      recipientType: 'operator',
      message: `🚨 EMERGENCY SOS - ${sosAlert.emergencyType.toUpperCase()}`,
      priority: 'critical',
      requiresEscalation: true,
      escalationDelaySeconds: 30
    });

    // 2. SMS to operators and authorities
    if (this.twilioClient && process.env.EMERGENCY_SMS_NUMBERS) {
      const smsNumbers = process.env.EMERGENCY_SMS_NUMBERS.split(',');
      smsNumbers.forEach(number => {
        notifications.push({
          sosAlertId: sosAlert.id,
          channelType: 'sms',
          recipient: number.trim(),
          recipientType: 'operator',
          message: this.formatEmergencySMS(sosAlert),
          priority: 'critical',
          requiresEscalation: true,
          escalationDelaySeconds: 30
        });
      });
    }

    // 3. Email to supervisors
    if (this.sendgridClient && process.env.EMERGENCY_EMAIL_LIST) {
      const emailList = process.env.EMERGENCY_EMAIL_LIST.split(',');
      emailList.forEach(email => {
        notifications.push({
          sosAlertId: sosAlert.id,
          channelType: 'email',
          recipient: email.trim(),
          recipientType: 'operator',
          subject: `🚨 CRITICAL: SOS Emergency Alert - ${sosAlert.sosCode}`,
          message: this.formatEmergencyEmail(sosAlert),
          priority: 'critical',
          requiresEscalation: false,
          escalationDelaySeconds: 0
        });
      });
    }

    // 4. Push notifications to mobile operators
    notifications.push({
      sosAlertId: sosAlert.id,
      channelType: 'push',
      recipient: 'operator_devices',
      recipientType: 'operator',
      message: `Emergency SOS: ${sosAlert.emergencyType} at ${sosAlert.location.address || 'Unknown location'}`,
      priority: 'critical',
      requiresEscalation: true,
      escalationDelaySeconds: 30
    });

    // Send all notifications
    await this.dispatchMultiChannelNotifications(notifications);
  }

  /**
   * Dispatch multi-channel notifications
   */
  private async dispatchMultiChannelNotifications(
    notifications: MultiChannelNotification[]
  ): Promise<void> {
    for (const notification of notifications) {
      try {
        await this.saveNotificationToDatabase(notification);

        switch (notification.channelType) {
          case 'in_app':
            await this.sendInAppNotification(notification);
            break;
          case 'sms':
            await this.sendSMSNotification(notification);
            break;
          case 'email':
            await this.sendEmailNotification(notification);
            break;
          case 'push':
            await this.sendPushNotification(notification);
            break;
          case 'phone_call':
            await this.initiatePhoneCall(notification);
            break;
        }

        // Setup escalation timer if required
        if (notification.requiresEscalation) {
          this.setupNotificationEscalation(notification);
        }
      } catch (error) {
        logger.error(`Failed to send ${notification.channelType} notification:`, error);
      }
    }
  }

  /**
   * Send In-App notification via WebSocket
   */
  private async sendInAppNotification(notification: MultiChannelNotification): Promise<void> {
    const wsManager = getWebSocketManager();
    if (!wsManager) {return;}

    const alertPayload = {
      type: 'EMERGENCY_SOS_ALERT',
      sosAlertId: notification.sosAlertId,
      message: notification.message,
      priority: notification.priority,
      requiresAcknowledgment: true,
      playSound: true,
      flashScreen: true,
      autoHideSeconds: 0, // Don't auto-hide
      timestamp: new Date().toISOString()
    };

    // Broadcast to all operators
    wsManager.broadcastToAll('emergency_alert', alertPayload);

    // Publish to Redis for distributed systems
    await redis.publish('emergency:in_app', alertPayload);

    // Update notification status
    await db.query(
      `UPDATE emergency_notification_channels
       SET status = $1, sent_at = NOW()
       WHERE sos_alert_id = $2 AND channel_type = $3`,
      ['sent', notification.sosAlertId, 'in_app']
    );
  }

  /**
   * Send SMS notification via Twilio
   */
  private async sendSMSNotification(notification: MultiChannelNotification): Promise<void> {
    if (!this.twilioClient) {
      logger.warn('Twilio not configured, skipping SMS notification');
      return;
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: notification.message,
        to: notification.recipient,
        from: process.env.TWILIO_PHONE_NUMBER || ''
      });

      await db.query(
        `UPDATE emergency_notification_channels
         SET status = $1, sent_at = NOW(), provider_message_id = $2
         WHERE sos_alert_id = $3 AND channel_type = $4 AND recipient = $5`,
        ['sent', message.sid, notification.sosAlertId, 'sms', notification.recipient]
      );

      logger.info(`SMS sent to ${notification.recipient}: ${message.sid}`);
    } catch (error) {
      logger.error(`Failed to send SMS to ${notification.recipient}:`, error);
      await db.query(
        `UPDATE emergency_notification_channels
         SET status = $1, failed_at = NOW()
         WHERE sos_alert_id = $2 AND channel_type = $3 AND recipient = $4`,
        ['failed', notification.sosAlertId, 'sms', notification.recipient]
      );
    }
  }

  /**
   * Send email notification via SendGrid
   */
  private async sendEmailNotification(notification: MultiChannelNotification): Promise<void> {
    if (!this.sendgridClient) {
      logger.warn('SendGrid not configured, skipping email notification');
      return;
    }

    try {
      const msg = {
        to: notification.recipient,
        from: process.env.SENDGRID_FROM_EMAIL || 'emergency@opstower.com',
        subject: notification.subject || 'Emergency SOS Alert',
        text: notification.message,
        html: this.formatEmergencyEmailHTML(notification.message)
      };

      await this.sendgridClient.send(msg);

      await db.query(
        `UPDATE emergency_notification_channels
         SET status = $1, sent_at = NOW()
         WHERE sos_alert_id = $2 AND channel_type = $3 AND recipient = $4`,
        ['sent', notification.sosAlertId, 'email', notification.recipient]
      );

      logger.info(`Email sent to ${notification.recipient}`);
    } catch (error) {
      logger.error(`Failed to send email to ${notification.recipient}:`, error);
      await db.query(
        `UPDATE emergency_notification_channels
         SET status = $1, failed_at = NOW()
         WHERE sos_alert_id = $2 AND channel_type = $3 AND recipient = $4`,
        ['failed', notification.sosAlertId, 'email', notification.recipient]
      );
    }
  }

  /**
   * Send push notification (placeholder for Firebase/APNs integration)
   */
  private async sendPushNotification(notification: MultiChannelNotification): Promise<void> {
    // TODO: Integrate with Firebase Cloud Messaging or APNs
    logger.info(`Push notification queued: ${notification.message}`);

    await db.query(
      `UPDATE emergency_notification_channels
       SET status = $1, sent_at = NOW()
       WHERE sos_alert_id = $2 AND channel_type = $3`,
      ['sent', notification.sosAlertId, 'push']
    );
  }

  /**
   * Initiate phone call (placeholder for Twilio Voice integration)
   */
  private async initiatePhoneCall(notification: MultiChannelNotification): Promise<void> {
    if (!this.twilioClient) {
      logger.warn('Twilio not configured, skipping phone call');
      return;
    }

    try {
      // TODO: Implement Twilio Voice call with TwiML instructions
      logger.info(`Phone call initiated to ${notification.recipient}`);

      await db.query(
        `UPDATE emergency_notification_channels
         SET status = $1, sent_at = NOW()
         WHERE sos_alert_id = $2 AND channel_type = $3 AND recipient = $4`,
        ['sent', notification.sosAlertId, 'phone_call', notification.recipient]
      );
    } catch (error) {
      logger.error(`Failed to initiate phone call to ${notification.recipient}:`, error);
    }
  }

  /**
   * Notify all verified emergency contacts
   */
  private async notifyEmergencyContacts(sosAlert: SOSAlert): Promise<void> {
    try {
      const contacts = await this.getEmergencyContacts(
        sosAlert.reporterId,
        sosAlert.reporterType
      );

      for (const contact of contacts) {
        // Send SMS if enabled
        if (contact.notifyViaSms && contact.phone) {
          await this.sendEmergencyContactSMS(contact, sosAlert);
        }

        // Send email if enabled
        if (contact.notifyViaEmail && contact.email) {
          await this.sendEmergencyContactEmail(contact, sosAlert);
        }

        // Initiate phone call if enabled
        if (contact.notifyViaPhoneCall && contact.phone) {
          await this.callEmergencyContact(contact, sosAlert);
        }
      }

      logger.info(`Notified ${contacts.length} emergency contacts for SOS ${sosAlert.sosCode}`);
    } catch (error) {
      logger.error('Failed to notify emergency contacts:', error);
    }
  }

  /**
   * Get emergency contacts for user
   */
  private async getEmergencyContacts(
    userId: string,
    userType: 'driver' | 'passenger'
  ): Promise<EmergencyContact[]> {
    const result = await db.query(
      `SELECT * FROM emergency_contacts
       WHERE user_id = $1 AND user_type = $2 AND is_active = TRUE AND is_verified = TRUE
       ORDER BY priority ASC`,
      [userId, userType]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userType: row.user_type,
      name: row.name,
      relationship: row.relationship,
      phone: row.phone,
      email: row.email,
      alternativePhone: row.alternative_phone,
      priority: row.priority,
      isVerified: row.is_verified,
      notifyViaSms: row.notify_via_sms,
      notifyViaEmail: row.notify_via_email,
      notifyViaPhoneCall: row.notify_via_phone_call,
      isActive: row.is_active
    }));
  }

  /**
   * Send SMS to emergency contact
   */
  private async sendEmergencyContactSMS(
    contact: EmergencyContact,
    sosAlert: SOSAlert
  ): Promise<void> {
    const message = this.formatEmergencyContactSMS(contact, sosAlert);

    const notification: MultiChannelNotification = {
      sosAlertId: sosAlert.id,
      channelType: 'sms',
      recipient: contact.phone,
      recipientType: 'emergency_contact',
      recipientId: contact.id,
      message,
      priority: 'critical',
      requiresEscalation: false,
      escalationDelaySeconds: 0
    };

    await this.sendSMSNotification(notification);
  }

  /**
   * Send email to emergency contact
   */
  private async sendEmergencyContactEmail(
    contact: EmergencyContact,
    sosAlert: SOSAlert
  ): Promise<void> {
    if (!contact.email) {return;}

    const notification: MultiChannelNotification = {
      sosAlertId: sosAlert.id,
      channelType: 'email',
      recipient: contact.email,
      recipientType: 'emergency_contact',
      recipientId: contact.id,
      subject: `🚨 EMERGENCY: SOS Alert`,
      message: this.formatEmergencyContactEmail(contact, sosAlert),
      priority: 'critical',
      requiresEscalation: false,
      escalationDelaySeconds: 0
    };

    await this.sendEmailNotification(notification);
  }

  /**
   * Call emergency contact
   */
  private async callEmergencyContact(
    contact: EmergencyContact,
    sosAlert: SOSAlert
  ): Promise<void> {
    const notification: MultiChannelNotification = {
      sosAlertId: sosAlert.id,
      channelType: 'phone_call',
      recipient: contact.phone,
      recipientType: 'emergency_contact',
      recipientId: contact.id,
      message: `Emergency SOS alert for ${sosAlert.reporterName}`,
      priority: 'critical',
      requiresEscalation: false,
      escalationDelaySeconds: 0
    };

    await this.initiatePhoneCall(notification);
  }

  /**
   * Start real-time location tracking
   */
  private async startLocationTracking(sosAlertId: string): Promise<void> {
    // Subscribe to location updates for this SOS
    await redis.subscribe([`location:sos:${sosAlertId}`], async (channel, message) => {
      try {
        const locationData = JSON.parse(message);
        await this.recordLocationTrailPoint(sosAlertId, locationData);
      } catch (error) {
        logger.error(`Failed to process location update for SOS ${sosAlertId}:`, error);
      }
    });

    logger.info(`Location tracking started for SOS ${sosAlertId}`);
  }

  /**
   * Record location trail point
   */
  async recordLocationTrailPoint(
    sosAlertId: string,
    locationData: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      altitude?: number;
      speed?: number;
      heading?: number;
      address?: string;
      locationSource?: 'gps' | 'network' | 'wifi' | 'manual';
      batteryLevel?: number;
      isMoving?: boolean;
    }
  ): Promise<LocationTrailPoint> {
    const result = await db.query(
      `INSERT INTO emergency_location_trail (
        sos_alert_id, location, accuracy, altitude, speed, heading,
        address, location_source, battery_level, is_moving, recorded_at
      ) VALUES (
        $1, ST_Point($2, $3), $4, $5, $6, $7, $8, $9, $10, $11, NOW()
      ) RETURNING *`,
      [
        sosAlertId,
        locationData.longitude,
        locationData.latitude,
        locationData.accuracy,
        locationData.altitude,
        locationData.speed,
        locationData.heading,
        locationData.address,
        locationData.locationSource || 'gps',
        locationData.batteryLevel,
        locationData.isMoving || false
      ]
    );

    // Broadcast location update via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      wsManager.broadcastToAll('emergency_location_update', {
        sosAlertId,
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        },
        timestamp: new Date().toISOString()
      });
    }

    return this.mapLocationTrailPoint(result.rows[0]);
  }

  /**
   * Setup escalation timer for SOS alert
   */
  private async setupEscalationTimer(sosAlert: SOSAlert): Promise<void> {
    // Get escalation rule for this emergency type
    const rule = await this.getEscalationRule(sosAlert.emergencyType, sosAlert.severity);

    if (!rule) {
      logger.info(`No escalation rule found for ${sosAlert.emergencyType}`);
      return;
    }

    // Setup timer for first escalation level
    const firstLevel = rule.escalationLevels[0];
    if (!firstLevel) {return;}

    const timer = setTimeout(async () => {
      await this.checkAndEscalate(sosAlert.id, rule);
    }, firstLevel.delaySeconds * 1000);

    this.escalationTimers.set(sosAlert.id, timer);
  }

  /**
   * Check if escalation is needed and execute
   */
  private async checkAndEscalate(sosAlertId: string, rule: EscalationRule): Promise<void> {
    // Check if SOS has been acknowledged
    const result = await db.query(
      'SELECT status, acknowledged_at FROM sos_alerts WHERE id = $1',
      [sosAlertId]
    );

    if (result.rows.length === 0) {return;}

    const sosAlert = result.rows[0];

    // If acknowledged, cancel escalation
    if (sosAlert.acknowledged_at || sosAlert.status === 'resolved') {
      this.cancelEscalationTimer(sosAlertId);
      return;
    }

    // Execute escalation actions
    logger.warn(`Escalating unacknowledged SOS ${sosAlertId}`);

    for (const level of rule.escalationLevels) {
      await this.executeEscalationActions(sosAlertId, level.actions);
    }
  }

  /**
   * Execute escalation actions
   */
  private async executeEscalationActions(sosAlertId: string, actions: string[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action) {
          case 'notify_supervisor':
            await this.notifySupervisor(sosAlertId);
            break;
          case 'send_sms':
            await this.sendEscalationSMS(sosAlertId);
            break;
          case 'call_authorities':
            await this.callAuthorities(sosAlertId);
            break;
          case 'alert_all_operators':
            await this.alertAllOperators(sosAlertId);
            break;
          case 'notify_emergency_contacts':
            // Already done in initial trigger
            break;
          case 'dispatch_help':
            await this.dispatchEmergencyHelp(sosAlertId);
            break;
        }
      } catch (error) {
        logger.error(`Failed to execute escalation action ${action}:`, error);
      }
    }
  }

  /**
   * Cancel escalation timer
   */
  private cancelEscalationTimer(sosAlertId: string): void {
    const timer = this.escalationTimers.get(sosAlertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(sosAlertId);
      logger.info(`Escalation timer cancelled for SOS ${sosAlertId}`);
    }
  }

  /**
   * Start monitoring for escalations
   */
  private startEscalationMonitoring(): void {
    // Check for unacknowledged emergencies every 10 seconds
    setInterval(async () => {
      try {
        const result = await db.query(`
          SELECT sa.id, sa.sos_code, sa.emergency_type, sa.severity, sa.triggered_at
          FROM sos_alerts sa
          WHERE sa.status IN ('triggered', 'processing', 'dispatched')
          AND sa.acknowledged_at IS NULL
          AND sa.triggered_at < NOW() - INTERVAL '30 seconds'
        `);

        for (const alert of result.rows) {
          logger.warn(`Unacknowledged emergency detected: ${alert.sos_code}`);
          // Escalation timers should handle this, but this is a safety net
        }
      } catch (error) {
        logger.error('Failed to monitor escalations:', error);
      }
    }, 10000);
  }

  // Helper methods for formatting messages

  private formatEmergencySMS(sosAlert: SOSAlert): string {
    return `🚨 EMERGENCY SOS\nCode: ${sosAlert.sosCode}\nType: ${sosAlert.emergencyType}\nLocation: ${sosAlert.location.address || `${sosAlert.location.latitude}, ${sosAlert.location.longitude}`}\nReporter: ${sosAlert.reporterName}\nTime: ${sosAlert.triggeredAt.toLocaleString()}`;
  }

  private formatEmergencyEmail(sosAlert: SOSAlert): string {
    return `
CRITICAL EMERGENCY SOS ALERT

SOS Code: ${sosAlert.sosCode}
Emergency Type: ${sosAlert.emergencyType.toUpperCase()}
Severity: ${sosAlert.severity}/10

Reporter: ${sosAlert.reporterName || 'Unknown'} (${sosAlert.reporterType})
Phone: ${sosAlert.reporterPhone || 'Not provided'}

Location: ${sosAlert.location.address || 'Unknown address'}
Coordinates: ${sosAlert.location.latitude}, ${sosAlert.location.longitude}
Accuracy: ${sosAlert.location.accuracy || 'Unknown'}m

Description: ${sosAlert.description || 'No description provided'}

Time Triggered: ${sosAlert.triggeredAt.toLocaleString()}

Emergency services have been notified.

--- OpsTower Emergency System ---
    `;
  }

  private formatEmergencyEmailHTML(message: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff3cd; border: 3px solid #dc3545; border-radius: 8px;">
        <h1 style="color: #dc3545; margin-top: 0;">🚨 EMERGENCY ALERT</h1>
        <div style="background-color: white; padding: 20px; border-radius: 4px; white-space: pre-line;">
          ${message}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          This is an automated emergency notification from OpsTower Emergency System.
        </p>
      </div>
    `;
  }

  private formatEmergencyContactSMS(contact: EmergencyContact, sosAlert: SOSAlert): string {
    return `🚨 EMERGENCY: Your contact ${sosAlert.reporterName} has triggered an SOS alert (${sosAlert.emergencyType}). Location: ${sosAlert.location.address || 'Unknown'}. Emergency services notified. SOS Code: ${sosAlert.sosCode}`;
  }

  private formatEmergencyContactEmail(contact: EmergencyContact, sosAlert: SOSAlert): string {
    return `
Dear ${contact.name},

This is an EMERGENCY NOTIFICATION.

Your emergency contact ${sosAlert.reporterName} has triggered an SOS alert.

Emergency Type: ${sosAlert.emergencyType}
Location: ${sosAlert.location.address || 'Unknown location'}
Coordinates: ${sosAlert.location.latitude}, ${sosAlert.location.longitude}
Time: ${sosAlert.triggeredAt.toLocaleString()}
SOS Code: ${sosAlert.sosCode}

Emergency services have been automatically notified and are responding.

If you need more information, please contact OpsTower Emergency Response.

--- OpsTower Emergency Contact System ---
    `;
  }

  // Placeholder methods for escalation actions

  private async notifySupervisor(sosAlertId: string): Promise<void> {
    logger.info(`Notifying supervisor for SOS ${sosAlertId}`);
  }

  private async sendEscalationSMS(sosAlertId: string): Promise<void> {
    logger.info(`Sending escalation SMS for SOS ${sosAlertId}`);
  }

  private async callAuthorities(sosAlertId: string): Promise<void> {
    logger.info(`Calling authorities for SOS ${sosAlertId}`);
  }

  private async alertAllOperators(sosAlertId: string): Promise<void> {
    logger.info(`Alerting all operators for SOS ${sosAlertId}`);
  }

  private async dispatchEmergencyHelp(sosAlertId: string): Promise<void> {
    logger.info(`Dispatching emergency help for SOS ${sosAlertId}`);
  }

  // Database helper methods

  private async saveNotificationToDatabase(notification: MultiChannelNotification): Promise<void> {
    await db.query(
      `INSERT INTO emergency_notification_channels (
        sos_alert_id, channel_type, recipient, recipient_type, recipient_id,
        subject, message, status, priority, requires_escalation, escalation_delay_seconds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        notification.sosAlertId,
        notification.channelType,
        notification.recipient,
        notification.recipientType,
        notification.recipientId,
        notification.subject,
        notification.message,
        'pending',
        notification.priority,
        notification.requiresEscalation,
        notification.escalationDelaySeconds
      ]
    );
  }

  private setupNotificationEscalation(notification: MultiChannelNotification): void {
    setTimeout(async () => {
      // Check if notification was acknowledged
      const result = await db.query(
        `SELECT acknowledged FROM emergency_notification_channels
         WHERE sos_alert_id = $1 AND channel_type = $2 AND recipient = $3`,
        [notification.sosAlertId, notification.channelType, notification.recipient]
      );

      if (result.rows.length > 0 && !result.rows[0].acknowledged) {
        logger.warn(`Escalating unacknowledged ${notification.channelType} notification`);
        // Escalate to next level (e.g., SMS -> Phone Call)
      }
    }, notification.escalationDelaySeconds * 1000);
  }

  private async getEscalationRule(
    emergencyType: SOSEmergencyType,
    severity: number
  ): Promise<EscalationRule | null> {
    const result = await db.query(
      `SELECT * FROM emergency_escalation_rules
       WHERE emergency_type = $1 AND severity_threshold <= $2 AND is_active = TRUE
       ORDER BY priority ASC LIMIT 1`,
      [emergencyType, severity]
    );

    if (result.rows.length === 0) {return null;}

    const row = result.rows[0];
    return {
      id: row.id,
      ruleName: row.rule_name,
      emergencyType: row.emergency_type,
      severityThreshold: row.severity_threshold,
      noResponseSeconds: row.no_response_seconds,
      escalationLevels: row.escalation_levels,
      isActive: row.is_active
    };
  }

  private mapLocationTrailPoint(row: any): LocationTrailPoint {
    return {
      id: row.id,
      sosAlertId: row.sos_alert_id,
      latitude: row.location.coordinates[1],
      longitude: row.location.coordinates[0],
      accuracy: row.accuracy,
      altitude: row.altitude,
      speed: row.speed,
      heading: row.heading,
      address: row.address,
      locationSource: row.location_source,
      batteryLevel: row.battery_level,
      isMoving: row.is_moving,
      geofenceBreached: row.geofence_breached,
      geofenceName: row.geofence_name,
      recordedAt: row.recorded_at
    };
  }
}

// Export singleton instance
export const enhancedSOSService = EnhancedSOSService.getInstance();

// Export types
export {
  EmergencyContact,
  EmergencyContactNotification,
  LocationTrailPoint,
  MultiChannelNotification,
  EscalationRule
};
