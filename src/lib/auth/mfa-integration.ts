/**
 * MFA Integration Service for Xpress Ops Tower
 * Connects MFA service with authentication flow and database
 *
 * Features:
 * - TOTP enrollment and verification
 * - SMS/Email backup codes
 * - Recovery code generation
 * - MFA challenge workflow
 * - Integration with login flow
 *
 * Phase 1B: Authentication & Session Security
 */

import { mfaService, MFAMethod, MFAVerificationResult, MFAEnrollmentResult } from './mfa-service';
import { mfaDatabaseService, MFASettings, MFAChallenge } from './mfa-database-service';
import { logger } from '../security/productionLogger';
import { auditLogger, AuditEventType, SecurityLevel } from '../security/auditLogger';

// Types
export interface MFASetupRequest {
  userId: string;
  method: MFAMethod;
  phoneNumber?: string;
  email?: string;
}

export interface MFASetupResponse {
  success: boolean;
  method: MFAMethod;
  secret?: string; // For TOTP
  qrCodeUrl?: string; // For TOTP
  backupCodes?: string[]; // For initial setup
  error?: string;
}

export interface MFAChallengeRequest {
  userId: string;
  method: MFAMethod;
  action?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface MFAChallengeResponse {
  success: boolean;
  challengeId?: string;
  expiresAt?: Date;
  error?: string;
  method?: MFAMethod;
}

export interface MFAVerifyRequest {
  challengeId: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * MFA Integration Manager
 * Handles MFA operations with database persistence
 */
export class MFAIntegrationManager {
  private static instance: MFAIntegrationManager;

  private constructor() {}

  public static getInstance(): MFAIntegrationManager {
    if (!MFAIntegrationManager.instance) {
      MFAIntegrationManager.instance = new MFAIntegrationManager();
    }
    return MFAIntegrationManager.instance;
  }

  // =====================================================
  // MFA Setup and Enrollment
  // =====================================================

  /**
   * Setup MFA for a user
   */
  async setupMFA(request: MFASetupRequest): Promise<MFASetupResponse> {
    try {
      let result: MFAEnrollmentResult;

      switch (request.method) {
        case 'totp':
          result = await this.setupTOTP(request.userId);
          break;

        case 'sms':
          if (!request.phoneNumber) {
            return {
              success: false,
              method: 'sms',
              error: 'Phone number is required for SMS MFA',
            };
          }
          result = await this.setupSMS(request.userId, request.phoneNumber);
          break;

        case 'email':
          if (!request.email) {
            return {
              success: false,
              method: 'email',
              error: 'Email address is required for email MFA',
            };
          }
          result = await this.setupEmail(request.userId, request.email);
          break;

        case 'backup_code':
          result = await this.setupBackupCodes(request.userId);
          break;

        default:
          return {
            success: false,
            method: request.method,
            error: 'Unsupported MFA method',
          };
      }

      // Log MFA enrollment
      await mfaDatabaseService.logMFAEvent(request.userId, 'mfa_enrollment', {
        method: request.method,
        success: result.success,
        errorMessage: result.errorMessage,
      });

      await auditLogger.logEvent(
        AuditEventType.MFA_ENROLLMENT,
        SecurityLevel.MEDIUM,
        result.success ? 'SUCCESS' : 'FAILURE',
        { method: request.method },
        { userId: request.userId, resource: 'mfa', action: 'enroll' }
      );

      return {
        success: result.success,
        method: request.method,
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        backupCodes: result.backupCodes,
        error: result.errorMessage,
      };
    } catch (error) {
      logger.error('MFA setup failed', { error, userId: request.userId, method: request.method });
      return {
        success: false,
        method: request.method,
        error: 'MFA setup failed',
      };
    }
  }

  /**
   * Setup TOTP (Time-based One-Time Password)
   */
  private async setupTOTP(userId: string): Promise<MFAEnrollmentResult> {
    try {
      // Generate TOTP secret
      const result = await mfaService.enableTOTP(userId);

      if (result.success && result.secret) {
        // Save to database
        await mfaDatabaseService.upsertMFASettings(userId, {
          totpEnabled: true,
          totpSecret: result.secret,
          mfaEnabled: true,
          preferredMethod: 'totp',
        });

        // Generate initial backup codes
        const backupResult = await this.setupBackupCodes(userId, false);

        return {
          ...result,
          backupCodes: backupResult.backupCodes,
        };
      }

      return result;
    } catch (error) {
      logger.error('TOTP setup failed', { error, userId });
      return {
        success: false,
        method: 'totp',
        errorMessage: 'Failed to setup TOTP authentication',
      };
    }
  }

  /**
   * Setup SMS authentication
   */
  private async setupSMS(userId: string, phoneNumber: string): Promise<MFAEnrollmentResult> {
    try {
      const result = await mfaService.enableSMS(userId, phoneNumber);

      if (result.success) {
        await mfaDatabaseService.upsertMFASettings(userId, {
          smsEnabled: true,
          smsPhone: phoneNumber,
          mfaEnabled: true,
          preferredMethod: 'sms',
        });
      }

      return result;
    } catch (error) {
      logger.error('SMS MFA setup failed', { error, userId });
      return {
        success: false,
        method: 'sms',
        errorMessage: 'Failed to setup SMS authentication',
      };
    }
  }

  /**
   * Setup email authentication
   */
  private async setupEmail(userId: string, email: string): Promise<MFAEnrollmentResult> {
    try {
      const result = await mfaService.enableEmail(userId, email);

      if (result.success) {
        await mfaDatabaseService.upsertMFASettings(userId, {
          emailEnabled: true,
          emailAddress: email,
          mfaEnabled: true,
          preferredMethod: 'email',
        });
      }

      return result;
    } catch (error) {
      logger.error('Email MFA setup failed', { error, userId });
      return {
        success: false,
        method: 'email',
        errorMessage: 'Failed to setup email authentication',
      };
    }
  }

  /**
   * Setup backup/recovery codes
   */
  private async setupBackupCodes(userId: string, logEvent: boolean = true): Promise<MFAEnrollmentResult> {
    try {
      const result = await mfaService.generateBackupCodes(userId, 10);

      if (result.success && result.backupCodes) {
        // Store hashed codes in database
        await mfaDatabaseService.generateBackupCodes(userId, result.backupCodes);

        if (logEvent) {
          await mfaDatabaseService.logMFAEvent(userId, 'backup_codes_generated', {
            method: 'backup_code',
            success: true,
          });
        }
      }

      return result;
    } catch (error) {
      logger.error('Backup codes generation failed', { error, userId });
      return {
        success: false,
        method: 'backup_code',
        errorMessage: 'Failed to generate backup codes',
      };
    }
  }

  // =====================================================
  // MFA Challenge Workflow
  // =====================================================

  /**
   * Create MFA challenge for user login
   */
  async createMFAChallenge(request: MFAChallengeRequest): Promise<MFAChallengeResponse> {
    try {
      // Get user's MFA settings
      const settings = await mfaDatabaseService.getMFASettings(request.userId);

      if (!settings || !settings.mfaEnabled) {
        return {
          success: false,
          error: 'MFA not enabled for this user',
        };
      }

      // Determine which method to use
      const method = request.method || settings.preferredMethod;

      // Check if the requested method is enabled
      if (method === 'totp' && !settings.totpEnabled) {
        return { success: false, error: 'TOTP not enabled' };
      }
      if (method === 'sms' && !settings.smsEnabled) {
        return { success: false, error: 'SMS not enabled' };
      }
      if (method === 'email' && !settings.emailEnabled) {
        return { success: false, error: 'Email not enabled' };
      }

      // Create challenge using MFA service
      const challenge = await mfaService.createChallenge(request.userId, method, {
        action: request.action || 'login',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });

      logger.info('MFA challenge created', {
        userId: request.userId,
        method,
        challengeId: challenge.challengeId,
      });

      // Update last used timestamp
      await mfaDatabaseService.updateLastUsed(request.userId);

      return {
        success: true,
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        method,
      };
    } catch (error) {
      logger.error('MFA challenge creation failed', { error, userId: request.userId });
      return {
        success: false,
        error: 'Failed to create MFA challenge',
      };
    }
  }

  /**
   * Verify MFA challenge response
   */
  async verifyMFAChallenge(request: MFAVerifyRequest): Promise<MFAVerificationResult> {
    try {
      // Verify the challenge using MFA service
      const result = await mfaService.verifyChallenge(request.challengeId, request.code, {
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });

      // Log verification attempt
      const challenge = await mfaDatabaseService.getChallenge(request.challengeId);

      if (challenge) {
        await mfaDatabaseService.logMFAEvent(challenge.userId, 'mfa_verification', {
          success: result.success,
          method: challenge.method,
          errorMessage: result.errorMessage,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
        });

        await auditLogger.logEvent(
          AuditEventType.MFA_VERIFICATION,
          result.success ? SecurityLevel.LOW : SecurityLevel.MEDIUM,
          result.success ? 'SUCCESS' : 'FAILURE',
          {
            method: challenge.method,
            remainingAttempts: result.remainingAttempts,
          },
          { userId: challenge.userId, resource: 'mfa', action: 'verify' }
        );
      }

      return result;
    } catch (error) {
      logger.error('MFA verification failed', { error, challengeId: request.challengeId });
      return {
        success: false,
        errorCode: 'INVALID_CODE',
        errorMessage: 'Verification failed',
      };
    }
  }

  // =====================================================
  // MFA Status and Management
  // =====================================================

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    methods: Array<{ type: MFAMethod; enabled: boolean; verified?: boolean }>;
    backupCodesRemaining: number;
  }> {
    try {
      const settings = await mfaDatabaseService.getMFASettings(userId);

      if (!settings) {
        return {
          enabled: false,
          methods: [],
          backupCodesRemaining: 0,
        };
      }

      return {
        enabled: settings.mfaEnabled,
        methods: [
          {
            type: 'totp',
            enabled: settings.totpEnabled,
            verified: !!settings.totpVerifiedAt,
          },
          {
            type: 'sms',
            enabled: settings.smsEnabled,
            verified: !!settings.smsVerifiedAt,
          },
          {
            type: 'email',
            enabled: settings.emailEnabled,
            verified: !!settings.emailVerifiedAt,
          },
          {
            type: 'backup_code',
            enabled: settings.backupCodesRemaining > 0,
          },
        ],
        backupCodesRemaining: settings.backupCodesRemaining,
      };
    } catch (error) {
      logger.error('Failed to get MFA status', { error, userId });
      return {
        enabled: false,
        methods: [],
        backupCodesRemaining: 0,
      };
    }
  }

  /**
   * Disable MFA method for a user
   */
  async disableMFAMethod(userId: string, method: MFAMethod): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await mfaDatabaseService.getMFASettings(userId);

      if (!settings) {
        return { success: false, error: 'MFA not configured' };
      }

      const updates: Partial<MFASettings> = {};

      switch (method) {
        case 'totp':
          updates.totpEnabled = false;
          updates.totpSecret = undefined;
          break;
        case 'sms':
          updates.smsEnabled = false;
          updates.smsPhone = undefined;
          break;
        case 'email':
          updates.emailEnabled = false;
          updates.emailAddress = undefined;
          break;
        default:
          return { success: false, error: 'Invalid method' };
      }

      // Check if this was the only enabled method
      const otherMethodsEnabled =
        (method !== 'totp' && settings.totpEnabled) ||
        (method !== 'sms' && settings.smsEnabled) ||
        (method !== 'email' && settings.emailEnabled);

      if (!otherMethodsEnabled) {
        updates.mfaEnabled = false;
      }

      await mfaDatabaseService.upsertMFASettings(userId, updates);

      await mfaDatabaseService.logMFAEvent(userId, 'mfa_disabled', {
        method,
        success: true,
      });

      await auditLogger.logEvent(
        AuditEventType.MFA_DISABLED,
        SecurityLevel.MEDIUM,
        'SUCCESS',
        { method },
        { userId, resource: 'mfa', action: 'disable' }
      );

      return { success: true };
    } catch (error) {
      logger.error('Failed to disable MFA method', { error, userId, method });
      return { success: false, error: 'Failed to disable MFA method' };
    }
  }

  /**
   * Check if user requires MFA for login
   */
  async requiresMFA(userId: string): Promise<boolean> {
    try {
      const settings = await mfaDatabaseService.getMFASettings(userId);
      return settings?.mfaEnabled || false;
    } catch (error) {
      logger.error('Failed to check MFA requirement', { error, userId });
      // Fail closed - require MFA if we can't determine
      return true;
    }
  }

  /**
   * Get preferred MFA method for user
   */
  async getPreferredMethod(userId: string): Promise<MFAMethod | null> {
    try {
      const settings = await mfaDatabaseService.getMFASettings(userId);
      return settings?.preferredMethod || null;
    } catch (error) {
      logger.error('Failed to get preferred MFA method', { error, userId });
      return null;
    }
  }
}

// Export singleton instance
export const mfaIntegration = MFAIntegrationManager.getInstance();

// Export convenience functions
export const setupMFA = (request: MFASetupRequest) => mfaIntegration.setupMFA(request);
export const createMFAChallenge = (request: MFAChallengeRequest) => mfaIntegration.createMFAChallenge(request);
export const verifyMFAChallenge = (request: MFAVerifyRequest) => mfaIntegration.verifyMFAChallenge(request);
export const getMFAStatus = (userId: string) => mfaIntegration.getMFAStatus(userId);
export const requiresMFA = (userId: string) => mfaIntegration.requiresMFA(userId);
