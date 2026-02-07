// Emergency Contact Management Service - Issue #12
// Manage emergency contacts for drivers and passengers (max 3 each)
// Contact verification and notification management

import { db } from '../database';
import { logger } from '../security/productionLogger';
import { redis } from '../redis';
import Twilio from 'twilio';
import crypto from 'crypto';

export interface CreateEmergencyContactInput {
  userId: string;
  userType: 'driver' | 'passenger';
  name: string;
  relationship: 'spouse' | 'parent' | 'child' | 'sibling' | 'friend' | 'coworker' | 'other';
  phone: string;
  email?: string;
  alternativePhone?: string;
  priority: 1 | 2 | 3;
  notifyViaSms?: boolean;
  notifyViaEmail?: boolean;
  notifyViaPhoneCall?: boolean;
}

export interface UpdateEmergencyContactInput {
  name?: string;
  relationship?: 'spouse' | 'parent' | 'child' | 'sibling' | 'friend' | 'coworker' | 'other';
  phone?: string;
  email?: string;
  alternativePhone?: string;
  priority?: 1 | 2 | 3;
  notifyViaSms?: boolean;
  notifyViaEmail?: boolean;
  notifyViaPhoneCall?: boolean;
  isActive?: boolean;
}

export interface EmergencyContact {
  id: string;
  userId: string;
  userType: 'driver' | 'passenger';
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  alternativePhone?: string;
  priority: number;
  isVerified: boolean;
  verificationCode?: string;
  verificationSentAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  notifyViaSms: boolean;
  notifyViaEmail: boolean;
  notifyViaPhoneCall: boolean;
  isActive: boolean;
  lastNotifiedAt?: Date;
  notificationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  contact?: EmergencyContact;
}

class EmergencyContactsService {
  private static instance: EmergencyContactsService;
  private twilioClient: Twilio.Twilio | null = null;

  private constructor() {
    this.initializeTwilio();
  }

  static getInstance(): EmergencyContactsService {
    if (!EmergencyContactsService.instance) {
      EmergencyContactsService.instance = new EmergencyContactsService();
    }
    return EmergencyContactsService.instance;
  }

  private initializeTwilio() {
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = Twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        logger.info('Twilio initialized for emergency contact verification');
      }
    } catch (error) {
      logger.error('Failed to initialize Twilio:', error);
    }
  }

  /**
   * Create new emergency contact (max 3 per user)
   */
  async createEmergencyContact(input: CreateEmergencyContactInput): Promise<EmergencyContact> {
    // Check if user already has 3 contacts
    const existingCount = await this.countEmergencyContacts(input.userId, input.userType);
    if (existingCount >= 3) {
      throw new Error(`Maximum of 3 emergency contacts allowed. Please delete an existing contact first.`);
    }

    // Check if priority is already taken
    const priorityTaken = await this.isPriorityTaken(
      input.userId,
      input.userType,
      input.priority
    );
    if (priorityTaken) {
      throw new Error(`Priority ${input.priority} is already assigned. Please choose a different priority or update the existing contact.`);
    }

    // Validate phone number format
    this.validatePhoneNumber(input.phone);

    // Generate verification code
    const verificationCode = this.generateVerificationCode();

    // Insert contact
    const result = await db.query(
      `INSERT INTO emergency_contacts (
        user_id, user_type, name, relationship, phone, email, alternative_phone,
        priority, notify_via_sms, notify_via_email, notify_via_phone_call,
        is_verified, verification_code, verification_sent_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14)
      RETURNING *`,
      [
        input.userId,
        input.userType,
        input.name,
        input.relationship,
        input.phone,
        input.email,
        input.alternativePhone,
        input.priority,
        input.notifyViaSms !== false, // Default true
        input.notifyViaEmail !== false, // Default true
        input.notifyViaPhoneCall || false, // Default false
        false, // Not verified yet
        verificationCode,
        true // Active by default
      ]
    );

    const contact = this.mapEmergencyContact(result.rows[0]);

    // Send verification code
    await this.sendVerificationCode(contact);

    logger.info(`Emergency contact created for ${input.userType} ${input.userId}: ${contact.id}`);
    return contact;
  }

  /**
   * Get all emergency contacts for a user
   */
  async getEmergencyContacts(userId: string, userType: 'driver' | 'passenger'): Promise<EmergencyContact[]> {
    const result = await db.query(
      `SELECT * FROM emergency_contacts
       WHERE user_id = $1 AND user_type = $2 AND is_active = TRUE
       ORDER BY priority ASC`,
      [userId, userType]
    );

    return result.rows.map(row => this.mapEmergencyContact(row));
  }

  /**
   * Get single emergency contact by ID
   */
  async getEmergencyContact(contactId: string): Promise<EmergencyContact | null> {
    const result = await db.query(
      'SELECT * FROM emergency_contacts WHERE id = $1',
      [contactId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapEmergencyContact(result.rows[0]);
  }

  /**
   * Update emergency contact
   */
  async updateEmergencyContact(
    contactId: string,
    input: UpdateEmergencyContactInput
  ): Promise<EmergencyContact> {
    const contact = await this.getEmergencyContact(contactId);
    if (!contact) {
      throw new Error(`Emergency contact ${contactId} not found`);
    }

    // Check if priority is being changed and if it's available
    if (input.priority && input.priority !== contact.priority) {
      const priorityTaken = await this.isPriorityTaken(
        contact.userId,
        contact.userType,
        input.priority
      );
      if (priorityTaken) {
        throw new Error(`Priority ${input.priority} is already assigned.`);
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.relationship !== undefined) {
      updates.push(`relationship = $${paramIndex++}`);
      values.push(input.relationship);
    }
    if (input.phone !== undefined) {
      this.validatePhoneNumber(input.phone);
      updates.push(`phone = $${paramIndex++}`);
      values.push(input.phone);

      // If phone changed, require re-verification
      if (input.phone !== contact.phone) {
        updates.push(`is_verified = FALSE`);
        updates.push(`verification_code = $${paramIndex++}`);
        values.push(this.generateVerificationCode());
      }
    }
    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(input.email);
    }
    if (input.alternativePhone !== undefined) {
      updates.push(`alternative_phone = $${paramIndex++}`);
      values.push(input.alternativePhone);
    }
    if (input.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(input.priority);
    }
    if (input.notifyViaSms !== undefined) {
      updates.push(`notify_via_sms = $${paramIndex++}`);
      values.push(input.notifyViaSms);
    }
    if (input.notifyViaEmail !== undefined) {
      updates.push(`notify_via_email = $${paramIndex++}`);
      values.push(input.notifyViaEmail);
    }
    if (input.notifyViaPhoneCall !== undefined) {
      updates.push(`notify_via_phone_call = $${paramIndex++}`);
      values.push(input.notifyViaPhoneCall);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }

    if (updates.length === 0) {
      return contact;
    }

    updates.push(`updated_at = NOW()`);
    values.push(contactId);

    const result = await db.query(
      `UPDATE emergency_contacts
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    const updatedContact = this.mapEmergencyContact(result.rows[0]);

    // If phone changed, send new verification
    if (input.phone && input.phone !== contact.phone) {
      await this.sendVerificationCode(updatedContact);
    }

    logger.info(`Emergency contact updated: ${contactId}`);
    return updatedContact;
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(contactId: string): Promise<void> {
    const result = await db.query(
      'UPDATE emergency_contacts SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [contactId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Emergency contact ${contactId} not found`);
    }

    logger.info(`Emergency contact deleted: ${contactId}`);
  }

  /**
   * Send verification code to contact
   */
  async sendVerificationCode(contact: EmergencyContact): Promise<void> {
    if (!this.twilioClient) {
      logger.warn('Twilio not configured, skipping verification SMS');
      return;
    }

    if (!contact.verificationCode) {
      throw new Error('No verification code available');
    }

    try {
      const message = `OpsTower Emergency Contact Verification\n\nYour verification code is: ${contact.verificationCode}\n\nYou have been added as an emergency contact. This code will expire in 10 minutes.`;

      await this.twilioClient.messages.create({
        body: message,
        to: contact.phone,
        from: process.env.TWILIO_PHONE_NUMBER || ''
      });

      // Update sent timestamp
      await db.query(
        'UPDATE emergency_contacts SET verification_sent_at = NOW() WHERE id = $1',
        [contact.id]
      );

      // Cache verification code for 10 minutes
      await redis.setex(
        `emergency_contact_verification:${contact.id}`,
        600,
        contact.verificationCode
      );

      logger.info(`Verification code sent to emergency contact ${contact.id}`);
    } catch (error) {
      logger.error(`Failed to send verification code to ${contact.phone}:`, error);
      throw new Error('Failed to send verification code');
    }
  }

  /**
   * Verify emergency contact with code
   */
  async verifyEmergencyContact(contactId: string, code: string): Promise<VerificationResult> {
    const contact = await this.getEmergencyContact(contactId);
    if (!contact) {
      return {
        success: false,
        message: 'Emergency contact not found'
      };
    }

    if (contact.isVerified) {
      return {
        success: true,
        message: 'Contact already verified',
        contact
      };
    }

    // Check cached code first
    const cachedCode = await redis.get(`emergency_contact_verification:${contactId}`);

    // Verify code
    if (cachedCode !== code && contact.verificationCode !== code) {
      return {
        success: false,
        message: 'Invalid verification code'
      };
    }

    // Check if code expired (10 minutes)
    if (contact.verificationSentAt) {
      const now = new Date();
      const sentAt = new Date(contact.verificationSentAt);
      const minutesElapsed = (now.getTime() - sentAt.getTime()) / (1000 * 60);

      if (minutesElapsed > 10) {
        return {
          success: false,
          message: 'Verification code expired. Please request a new code.'
        };
      }
    }

    // Mark as verified
    const result = await db.query(
      `UPDATE emergency_contacts
       SET is_verified = TRUE, verified_at = NOW(), verified_by = 'sms', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [contactId]
    );

    // Delete cached code
    await redis.del(`emergency_contact_verification:${contactId}`);

    const verifiedContact = this.mapEmergencyContact(result.rows[0]);

    logger.info(`Emergency contact verified: ${contactId}`);

    return {
      success: true,
      message: 'Emergency contact verified successfully',
      contact: verifiedContact
    };
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(contactId: string): Promise<void> {
    const contact = await this.getEmergencyContact(contactId);
    if (!contact) {
      throw new Error('Emergency contact not found');
    }

    if (contact.isVerified) {
      throw new Error('Contact is already verified');
    }

    // Generate new code
    const newCode = this.generateVerificationCode();

    await db.query(
      'UPDATE emergency_contacts SET verification_code = $1, verification_sent_at = NOW() WHERE id = $2',
      [newCode, contactId]
    );

    // Send new code
    await this.sendVerificationCode({
      ...contact,
      verificationCode: newCode,
      verificationSentAt: new Date()
    });

    logger.info(`Verification code resent for contact ${contactId}`);
  }

  /**
   * Get emergency contact notification history
   */
  async getNotificationHistory(contactId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT * FROM emergency_contact_notifications
       WHERE emergency_contact_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [contactId]
    );

    return result.rows;
  }

  /**
   * Get statistics for emergency contacts
   */
  async getContactStatistics(userId: string, userType: 'driver' | 'passenger'): Promise<any> {
    const result = await db.query(
      `SELECT
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN is_verified THEN 1 END) as verified_contacts,
        COUNT(CASE WHEN NOT is_verified THEN 1 END) as unverified_contacts,
        COUNT(CASE WHEN is_active THEN 1 END) as active_contacts,
        COUNT(CASE WHEN notify_via_sms THEN 1 END) as sms_enabled,
        COUNT(CASE WHEN notify_via_email THEN 1 END) as email_enabled,
        COUNT(CASE WHEN notify_via_phone_call THEN 1 END) as call_enabled,
        SUM(notification_count) as total_notifications
       FROM emergency_contacts
       WHERE user_id = $1 AND user_type = $2`,
      [userId, userType]
    );

    return result.rows[0];
  }

  // Helper methods

  private async countEmergencyContacts(userId: string, userType: 'driver' | 'passenger'): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM emergency_contacts WHERE user_id = $1 AND user_type = $2 AND is_active = TRUE',
      [userId, userType]
    );
    return parseInt(result.rows[0].count);
  }

  private async isPriorityTaken(
    userId: string,
    userType: 'driver' | 'passenger',
    priority: number
  ): Promise<boolean> {
    const result = await db.query(
      'SELECT id FROM emergency_contacts WHERE user_id = $1 AND user_type = $2 AND priority = $3 AND is_active = TRUE',
      [userId, userType, priority]
    );
    return result.rows.length > 0;
  }

  private validatePhoneNumber(phone: string): void {
    // Basic Philippine phone number validation
    const phoneRegex = /^(\+63|0)[0-9]{10}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
      throw new Error('Invalid phone number format. Use +639XXXXXXXXX or 09XXXXXXXXX format.');
    }
  }

  private generateVerificationCode(): string {
    // Generate 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private mapEmergencyContact(row: any): EmergencyContact {
    return {
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
      verificationCode: row.verification_code,
      verificationSentAt: row.verification_sent_at,
      verifiedAt: row.verified_at,
      verifiedBy: row.verified_by,
      notifyViaSms: row.notify_via_sms,
      notifyViaEmail: row.notify_via_email,
      notifyViaPhoneCall: row.notify_via_phone_call,
      isActive: row.is_active,
      lastNotifiedAt: row.last_notified_at,
      notificationCount: row.notification_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Export singleton instance
export const emergencyContactsService = EmergencyContactsService.getInstance();

// Export types
export {
  CreateEmergencyContactInput,
  UpdateEmergencyContactInput,
  EmergencyContact,
  VerificationResult
};
