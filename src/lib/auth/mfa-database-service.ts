/**
 * MFA Database Service
 * Provides database persistence layer for MFA operations
 *
 * Features:
 * - PostgreSQL integration with proper connection pooling
 * - Encrypted storage of MFA secrets
 * - Backup code management
 * - Challenge lifecycle management
 * - Comprehensive audit logging
 *
 * Issue #16: Multi-Factor Authentication (P1)
 */

import { Pool } from 'pg';
import { encrypt, decrypt, encryptDeterministic } from '@/lib/security/encryption';
import { createHmac, randomBytes } from 'crypto';

// Types
export interface MFASettings {
  userId: string;
  mfaEnabled: boolean;
  mfaEnforced: boolean;
  totpEnabled: boolean;
  totpSecret?: string;
  totpVerifiedAt?: Date;
  smsEnabled: boolean;
  smsPhone?: string;
  smsVerifiedAt?: Date;
  emailEnabled: boolean;
  emailAddress?: string;
  emailVerifiedAt?: Date;
  preferredMethod: 'totp' | 'sms' | 'email';
  backupCodesRemaining: number;
  backupCodesGeneratedAt?: Date;
  recoveryEmail?: string;
  recoveryPhone?: string;
  trustedDevices?: any[];
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

export interface MFAChallenge {
  id: string;
  challengeId: string;
  userId: string;
  method: 'sms' | 'email' | 'totp' | 'backup_code';
  codeHash: string;
  createdAt: Date;
  expiresAt: Date;
  verifiedAt?: Date;
  attempts: number;
  maxAttempts: number;
  lockedAt?: Date;
  action?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  status: 'pending' | 'verified' | 'expired' | 'locked' | 'cancelled';
}

export interface MFABackupCode {
  id: string;
  userId: string;
  codeHash: string;
  codeIndex: number;
  usedAt?: Date;
  usedIp?: string;
  usedUserAgent?: string;
  createdAt: Date;
  expiresAt?: Date;
}

// Database connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'opstower',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

/**
 * MFA Database Service Class
 */
export class MFADatabaseService {
  private pool: Pool;
  private readonly secretKey: string;

  constructor() {
    this.pool = getPool();
    this.secretKey = process.env.MFA_SECRET_KEY || process.env.DATABASE_ENCRYPTION_KEY || 'fallback-key';
  }

  // =====================================================
  // MFA Settings Management
  // =====================================================

  /**
   * Get MFA settings for a user
   */
  async getMFASettings(userId: string): Promise<MFASettings | null> {
    const query = `
      SELECT
        user_id,
        mfa_enabled,
        mfa_enforced,
        totp_enabled,
        totp_secret,
        totp_verified_at,
        sms_enabled,
        sms_phone,
        sms_verified_at,
        email_enabled,
        email_address,
        email_verified_at,
        preferred_method,
        backup_codes_remaining,
        backup_codes_generated_at,
        recovery_email,
        recovery_phone,
        trusted_devices,
        created_at,
        updated_at,
        last_used_at
      FROM user_mfa_settings
      WHERE user_id = $1
    `;

    try {
      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Decrypt sensitive fields
      return {
        userId: row.user_id,
        mfaEnabled: row.mfa_enabled,
        mfaEnforced: row.mfa_enforced,
        totpEnabled: row.totp_enabled,
        totpSecret: row.totp_secret ? decrypt(row.totp_secret) : undefined,
        totpVerifiedAt: row.totp_verified_at,
        smsEnabled: row.sms_enabled,
        smsPhone: row.sms_phone ? decrypt(row.sms_phone) : undefined,
        smsVerifiedAt: row.sms_verified_at,
        emailEnabled: row.email_enabled,
        emailAddress: row.email_address ? decrypt(row.email_address) : undefined,
        emailVerifiedAt: row.email_verified_at,
        preferredMethod: row.preferred_method,
        backupCodesRemaining: row.backup_codes_remaining,
        backupCodesGeneratedAt: row.backup_codes_generated_at,
        recoveryEmail: row.recovery_email ? decrypt(row.recovery_email) : undefined,
        recoveryPhone: row.recovery_phone ? decrypt(row.recovery_phone) : undefined,
        trustedDevices: row.trusted_devices,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUsedAt: row.last_used_at,
      };
    } catch (error) {
      console.error('Error getting MFA settings:', error);
      throw error;
    }
  }

  /**
   * Create or update MFA settings
   */
  async upsertMFASettings(userId: string, settings: Partial<MFASettings>): Promise<void> {
    // Encrypt sensitive fields
    const encryptedSettings: any = {};

    if (settings.totpSecret !== undefined) {
      encryptedSettings.totp_secret = encrypt(settings.totpSecret);
    }
    if (settings.smsPhone !== undefined) {
      encryptedSettings.sms_phone = encrypt(settings.smsPhone);
    }
    if (settings.emailAddress !== undefined) {
      encryptedSettings.email_address = encrypt(settings.emailAddress);
    }
    if (settings.recoveryEmail !== undefined) {
      encryptedSettings.recovery_email = encrypt(settings.recoveryEmail);
    }
    if (settings.recoveryPhone !== undefined) {
      encryptedSettings.recovery_phone = encrypt(settings.recoveryPhone);
    }

    // Build dynamic query
    const updates: string[] = [];
    const values: any[] = [userId];
    let paramIndex = 2;

    const fieldMap: Record<string, string> = {
      mfaEnabled: 'mfa_enabled',
      mfaEnforced: 'mfa_enforced',
      totpEnabled: 'totp_enabled',
      totpVerifiedAt: 'totp_verified_at',
      smsEnabled: 'sms_enabled',
      smsVerifiedAt: 'sms_verified_at',
      emailEnabled: 'email_enabled',
      emailVerifiedAt: 'email_verified_at',
      preferredMethod: 'preferred_method',
      backupCodesRemaining: 'backup_codes_remaining',
      backupCodesGeneratedAt: 'backup_codes_generated_at',
      trustedDevices: 'trusted_devices',
    };

    // Add regular fields
    for (const [jsField, dbField] of Object.entries(fieldMap)) {
      if (settings[jsField as keyof MFASettings] !== undefined) {
        updates.push(`${dbField} = $${paramIndex}`);
        values.push(settings[jsField as keyof MFASettings]);
        paramIndex++;
      }
    }

    // Add encrypted fields
    for (const [dbField, encryptedValue] of Object.entries(encryptedSettings)) {
      updates.push(`${dbField} = $${paramIndex}`);
      values.push(encryptedValue);
      paramIndex++;
    }

    if (updates.length === 0) {
      return; // No updates to perform
    }

    const query = `
      INSERT INTO user_mfa_settings (user_id, ${updates.map(u => u.split(' = ')[0]).join(', ')})
      VALUES ($1, ${updates.map((_, i) => `$${i + 2}`).join(', ')})
      ON CONFLICT (user_id) DO UPDATE SET
        ${updates.join(', ')},
        updated_at = NOW()
    `;

    try {
      await this.pool.query(query, values);
    } catch (error) {
      console.error('Error upserting MFA settings:', error);
      throw error;
    }
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(userId: string): Promise<void> {
    const query = `
      UPDATE user_mfa_settings
      SET last_used_at = NOW()
      WHERE user_id = $1
    `;

    try {
      await this.pool.query(query, [userId]);
    } catch (error) {
      console.error('Error updating MFA last used:', error);
    }
  }

  // =====================================================
  // Challenge Management
  // =====================================================

  /**
   * Create a new MFA challenge
   */
  async createChallenge(
    userId: string,
    method: 'sms' | 'email' | 'totp' | 'backup_code',
    codeHash: string,
    options: {
      challengeId: string;
      expiresAt: Date;
      action?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: any;
      maxAttempts?: number;
    }
  ): Promise<MFAChallenge> {
    const query = `
      INSERT INTO mfa_challenges (
        challenge_id, user_id, method, code_hash, expires_at,
        action, ip_address, user_agent, metadata, max_attempts
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      options.challengeId,
      userId,
      method,
      codeHash,
      options.expiresAt,
      options.action || null,
      options.ipAddress || null,
      options.userAgent || null,
      options.metadata ? JSON.stringify(options.metadata) : '{}',
      options.maxAttempts || 3,
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapChallenge(result.rows[0]);
    } catch (error) {
      console.error('Error creating MFA challenge:', error);
      throw error;
    }
  }

  /**
   * Get challenge by challenge ID
   */
  async getChallenge(challengeId: string): Promise<MFAChallenge | null> {
    const query = `
      SELECT * FROM mfa_challenges
      WHERE challenge_id = $1
    `;

    try {
      const result = await this.pool.query(query, [challengeId]);
      return result.rows.length > 0 ? this.mapChallenge(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting MFA challenge:', error);
      throw error;
    }
  }

  /**
   * Increment challenge attempts
   */
  async incrementChallengeAttempts(challengeId: string): Promise<void> {
    const query = `
      UPDATE mfa_challenges
      SET attempts = attempts + 1
      WHERE challenge_id = $1
    `;

    try {
      await this.pool.query(query, [challengeId]);
    } catch (error) {
      console.error('Error incrementing challenge attempts:', error);
      throw error;
    }
  }

  /**
   * Mark challenge as verified
   */
  async markChallengeVerified(challengeId: string): Promise<void> {
    const query = `
      UPDATE mfa_challenges
      SET
        status = 'verified',
        verified_at = NOW()
      WHERE challenge_id = $1
    `;

    try {
      await this.pool.query(query, [challengeId]);
    } catch (error) {
      console.error('Error marking challenge verified:', error);
      throw error;
    }
  }

  /**
   * Lock challenge (max attempts exceeded)
   */
  async lockChallenge(challengeId: string): Promise<void> {
    const query = `
      UPDATE mfa_challenges
      SET
        status = 'locked',
        locked_at = NOW()
      WHERE challenge_id = $1
    `;

    try {
      await this.pool.query(query, [challengeId]);
    } catch (error) {
      console.error('Error locking challenge:', error);
      throw error;
    }
  }

  /**
   * Expire challenge
   */
  async expireChallenge(challengeId: string): Promise<void> {
    const query = `
      UPDATE mfa_challenges
      SET status = 'expired'
      WHERE challenge_id = $1
    `;

    try {
      await this.pool.query(query, [challengeId]);
    } catch (error) {
      console.error('Error expiring challenge:', error);
      throw error;
    }
  }

  // =====================================================
  // Backup Codes Management
  // =====================================================

  /**
   * Generate backup codes
   */
  async generateBackupCodes(userId: string, codes: string[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Delete existing unused codes
      await client.query(
        'DELETE FROM mfa_backup_codes WHERE user_id = $1 AND used_at IS NULL',
        [userId]
      );

      // Insert new codes
      for (let i = 0; i < codes.length; i++) {
        const codeHash = this.hashBackupCode(codes[i]);
        await client.query(
          `INSERT INTO mfa_backup_codes (user_id, code_hash, code_index)
           VALUES ($1, $2, $3)`,
          [userId, codeHash, i + 1]
        );
      }

      // Update settings
      await client.query(
        `UPDATE user_mfa_settings
         SET
           backup_codes_remaining = $2,
           backup_codes_generated_at = NOW(),
           updated_at = NOW()
         WHERE user_id = $1`,
        [userId, codes.length]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error generating backup codes:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify and consume backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const codeHash = this.hashBackupCode(code);

    const query = `
      UPDATE mfa_backup_codes
      SET
        used_at = NOW(),
        used_ip = $3,
        used_user_agent = $4
      WHERE user_id = $1
        AND code_hash = $2
        AND used_at IS NULL
      RETURNING id
    `;

    try {
      const result = await this.pool.query(query, [
        userId,
        codeHash,
        null, // IP address (pass from context)
        null, // User agent (pass from context)
      ]);

      if (result.rows.length > 0) {
        // Decrement backup codes remaining
        await this.pool.query(
          `UPDATE user_mfa_settings
           SET backup_codes_remaining = GREATEST(backup_codes_remaining - 1, 0)
           WHERE user_id = $1`,
          [userId]
        );

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      throw error;
    }
  }

  /**
   * Get remaining backup codes count
   */
  async getBackupCodesRemaining(userId: string): Promise<number> {
    const query = `
      SELECT backup_codes_remaining
      FROM user_mfa_settings
      WHERE user_id = $1
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      return result.rows[0]?.backup_codes_remaining || 0;
    } catch (error) {
      console.error('Error getting backup codes remaining:', error);
      throw error;
    }
  }

  // =====================================================
  // Audit Logging
  // =====================================================

  /**
   * Log MFA enrollment event
   */
  async logMFAEvent(
    userId: string,
    eventType: string,
    options: {
      method?: string;
      success?: boolean;
      errorMessage?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      metadata?: any;
    }
  ): Promise<void> {
    const query = `
      INSERT INTO mfa_enrollment_audit (
        user_id, event_type, method, success, error_message,
        ip_address, user_agent, session_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [
      userId,
      eventType,
      options.method || null,
      options.success !== undefined ? options.success : true,
      options.errorMessage || null,
      options.ipAddress || null,
      options.userAgent || null,
      options.sessionId || null,
      options.metadata ? JSON.stringify(options.metadata) : '{}',
    ];

    try {
      await this.pool.query(query, values);
    } catch (error) {
      console.error('Error logging MFA event:', error);
      // Don't throw - audit logging shouldn't break functionality
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Hash backup code
   */
  private hashBackupCode(code: string): string {
    return createHmac('sha256', this.secretKey)
      .update(code.toUpperCase())
      .digest('hex');
  }

  /**
   * Map database row to MFAChallenge object
   */
  private mapChallenge(row: any): MFAChallenge {
    return {
      id: row.id,
      challengeId: row.challenge_id,
      userId: row.user_id,
      method: row.method,
      codeHash: row.code_hash,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      verifiedAt: row.verified_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lockedAt: row.locked_at,
      action: row.action,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata,
      status: row.status,
    };
  }

  /**
   * Cleanup expired challenges and recovery requests
   */
  async cleanupExpired(): Promise<void> {
    try {
      await this.pool.query('SELECT cleanup_expired_mfa_challenges()');
      await this.pool.query('SELECT cleanup_expired_mfa_recovery()');
    } catch (error) {
      console.error('Error cleaning up expired MFA data:', error);
    }
  }
}

// Export singleton instance
export const mfaDatabaseService = new MFADatabaseService();

export default mfaDatabaseService;
