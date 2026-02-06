/**
 * MFA Setup API Route
 * Initiates MFA enrollment process with TOTP and backup codes
 *
 * POST /api/auth/mfa/setup - Generate TOTP secret and QR code
 *
 * Features:
 * - TOTP secret generation (base32)
 * - QR code URL for Google Authenticator/Authy
 * - 10 backup codes generated
 * - Encrypted storage of secrets
 * - Comprehensive audit logging
 *
 * Issue #16: Multi-Factor Authentication (P1)
 */

import { NextRequest, NextResponse } from 'next/server';
import * as speakeasy from 'speakeasy';
import { randomBytes } from 'crypto';
import { mfaDatabaseService } from '@/lib/auth/mfa-database-service';
import { createApiResponse, createApiError } from '@/lib/api-utils';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';

// Helper to generate backup codes
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude confusing characters

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }

  return codes;
}

/**
 * POST /api/auth/mfa/setup
 * Generate TOTP secret and backup codes for MFA enrollment
 */
export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Get authenticated user from token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiError(
        'Authentication required',
        'AUTH_REQUIRED',
        401,
        undefined,
        '/api/auth/mfa/setup',
        'POST'
      );
    }

    // Parse JWT token (simplified - in production use proper JWT verification)
    const token = authHeader.substring(7);
    // TODO: Verify JWT and extract user ID
    // For now, we'll use a placeholder
    const userId = 'user-id-from-token'; // Replace with actual JWT verification

    // Check if MFA is already enabled
    const existingSettings = await mfaDatabaseService.getMFASettings(userId);
    if (existingSettings?.mfaEnabled) {
      return createApiError(
        'MFA is already enabled for this account',
        'MFA_ALREADY_ENABLED',
        400,
        undefined,
        '/api/auth/mfa/setup',
        'POST'
      );
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Xpress Ops Tower (${userId})`,
      issuer: 'Xpress Ops Tower',
      length: 32,
    });

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // Store encrypted TOTP secret (but don't enable MFA yet - requires verification)
    await mfaDatabaseService.upsertMFASettings(userId, {
      totpSecret: secret.base32,
      totpEnabled: false, // Not enabled until verified
      preferredMethod: 'totp',
    });

    // Store backup codes
    await mfaDatabaseService.generateBackupCodes(userId, backupCodes);

    // Log MFA setup initiation
    await mfaDatabaseService.logMFAEvent(userId, 'setup_initiated', {
      method: 'totp',
      success: true,
      ipAddress: clientIP,
      userAgent,
      metadata: {
        backupCodesGenerated: backupCodes.length,
      },
    });

    await auditLogger.logEvent(
      AuditEventType.MFA_SETUP,
      SecurityLevel.MEDIUM,
      'SUCCESS',
      {
        action: 'mfa_setup_initiated',
        method: 'totp',
        backupCodesGenerated: backupCodes.length,
      },
      {
        userId,
        resource: 'auth',
        action: 'mfa_setup',
        ipAddress: clientIP,
      }
    );

    // Return setup data
    return NextResponse.json({
      success: true,
      message: 'MFA setup initiated. Scan QR code and verify to complete enrollment.',
      data: {
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url,
        backupCodes,
        // Manual entry key (formatted for readability)
        manualEntryKey: secret.base32.match(/.{1,4}/g)?.join(' ') || secret.base32,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'MFA setup failed';

    console.error('MFA setup error:', error);

    await auditLogger.logEvent(
      AuditEventType.MFA_SETUP,
      SecurityLevel.HIGH,
      'FAILURE',
      {
        error: errorMessage,
      },
      {
        resource: 'auth',
        action: 'mfa_setup',
        ipAddress: clientIP,
      }
    );

    return createApiError(
      'Failed to initiate MFA setup',
      'MFA_SETUP_ERROR',
      500,
      undefined,
      '/api/auth/mfa/setup',
      'POST'
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
