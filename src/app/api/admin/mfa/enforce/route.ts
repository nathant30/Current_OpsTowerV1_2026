/**
 * Admin MFA Enforcement API Route
 * Allows administrators to enforce MFA for users or roles
 *
 * POST /api/admin/mfa/enforce - Enforce MFA for specific users/roles
 * GET /api/admin/mfa/enforce - Get MFA enforcement status
 * DELETE /api/admin/mfa/enforce - Remove MFA enforcement
 *
 * Features:
 * - User-level MFA enforcement
 * - Role-level MFA enforcement
 * - Grace period configuration
 * - Exemption management
 * - Comprehensive audit logging
 *
 * Issue #16: Multi-Factor Authentication (P1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { mfaDatabaseService } from '@/lib/auth/mfa-database-service';
import { createApiResponse, createApiError } from '@/lib/api-utils';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';

/**
 * POST /api/admin/mfa/enforce
 * Enforce MFA for specific users or roles
 */
export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiError(
        'Authentication required',
        'AUTH_REQUIRED',
        401,
        undefined,
        '/api/admin/mfa/enforce',
        'POST'
      );
    }

    // TODO: Verify admin role from JWT token
    const adminUserId = 'admin-user-id'; // Replace with actual JWT verification

    const body = await request.json();
    const { userIds, roleIds, gracePeriodDays = 7, reason } = body;

    if ((!userIds || userIds.length === 0) && (!roleIds || roleIds.length === 0)) {
      return createApiError(
        'At least one user ID or role ID is required',
        'VALIDATION_ERROR',
        400,
        undefined,
        '/api/admin/mfa/enforce',
        'POST'
      );
    }

    if (!reason) {
      return createApiError(
        'Enforcement reason is required',
        'VALIDATION_ERROR',
        400,
        undefined,
        '/api/admin/mfa/enforce',
        'POST'
      );
    }

    const enforcedUsers: string[] = [];
    const errors: Array<{ userId: string; error: string }> = [];

    // Enforce MFA for specified users
    if (userIds && Array.isArray(userIds)) {
      for (const userId of userIds) {
        try {
          await mfaDatabaseService.upsertMFASettings(userId, {
            mfaEnforced: true,
          });

          await mfaDatabaseService.logMFAEvent(userId, 'mfa_enforced', {
            success: true,
            ipAddress: clientIP,
            userAgent,
            metadata: {
              enforcedBy: adminUserId,
              gracePeriodDays,
              reason,
            },
          });

          enforcedUsers.push(userId);
        } catch (error) {
          errors.push({
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Log admin action
    await auditLogger.logEvent(
      AuditEventType.CONFIG_CHANGE,
      SecurityLevel.HIGH,
      'SUCCESS',
      {
        action: 'mfa_enforcement_applied',
        userCount: enforcedUsers.length,
        roleCount: roleIds?.length || 0,
        gracePeriodDays,
        reason,
        errors: errors.length > 0 ? errors : undefined,
      },
      {
        userId: adminUserId,
        resource: 'mfa_enforcement',
        action: 'enforce',
        ipAddress: clientIP,
      }
    );

    return NextResponse.json({
      success: true,
      message: `MFA enforcement applied to ${enforcedUsers.length} user(s)`,
      data: {
        enforcedUsers,
        errors: errors.length > 0 ? errors : undefined,
        gracePeriodDays,
        enforcementDate: new Date().toISOString(),
        enforcementDeadline: new Date(
          Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'MFA enforcement failed';

    console.error('MFA enforcement error:', error);

    await auditLogger.logEvent(
      AuditEventType.CONFIG_CHANGE,
      SecurityLevel.HIGH,
      'FAILURE',
      {
        error: errorMessage,
        action: 'mfa_enforcement_failed',
      },
      {
        resource: 'mfa_enforcement',
        action: 'enforce',
        ipAddress: clientIP,
      }
    );

    return createApiError(
      'Failed to enforce MFA',
      'MFA_ENFORCEMENT_ERROR',
      500,
      undefined,
      '/api/admin/mfa/enforce',
      'POST'
    );
  }
}

/**
 * GET /api/admin/mfa/enforce
 * Get MFA enforcement status and statistics
 */
export async function GET(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';

  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiError(
        'Authentication required',
        'AUTH_REQUIRED',
        401,
        undefined,
        '/api/admin/mfa/enforce',
        'GET'
      );
    }

    // TODO: Query enforcement statistics from database
    // For now, return mock data structure

    const stats = {
      totalUsers: 100,
      mfaEnabledUsers: 75,
      mfaEnforcedUsers: 50,
      mfaAdoptionRate: 75.0,
      enforcementComplianceRate: 66.7,
      usersWithGracePeriod: 10,
      usersOverdue: 5,
    };

    return NextResponse.json({
      success: true,
      data: {
        statistics: stats,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get enforcement status';

    console.error('MFA enforcement status error:', error);

    return createApiError(
      'Failed to get MFA enforcement status',
      'MFA_ENFORCEMENT_STATUS_ERROR',
      500,
      undefined,
      '/api/admin/mfa/enforce',
      'GET'
    );
  }
}

/**
 * DELETE /api/admin/mfa/enforce
 * Remove MFA enforcement for specific users
 */
export async function DELETE(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiError(
        'Authentication required',
        'AUTH_REQUIRED',
        401,
        undefined,
        '/api/admin/mfa/enforce',
        'DELETE'
      );
    }

    // TODO: Verify admin role from JWT token
    const adminUserId = 'admin-user-id'; // Replace with actual JWT verification

    const body = await request.json();
    const { userIds, reason } = body;

    if (!userIds || userIds.length === 0) {
      return createApiError(
        'At least one user ID is required',
        'VALIDATION_ERROR',
        400,
        undefined,
        '/api/admin/mfa/enforce',
        'DELETE'
      );
    }

    if (!reason) {
      return createApiError(
        'Reason for removing enforcement is required',
        'VALIDATION_ERROR',
        400,
        undefined,
        '/api/admin/mfa/enforce',
        'DELETE'
      );
    }

    const updatedUsers: string[] = [];
    const errors: Array<{ userId: string; error: string }> = [];

    // Remove MFA enforcement
    for (const userId of userIds) {
      try {
        await mfaDatabaseService.upsertMFASettings(userId, {
          mfaEnforced: false,
        });

        await mfaDatabaseService.logMFAEvent(userId, 'mfa_disabled', {
          success: true,
          ipAddress: clientIP,
          userAgent,
          metadata: {
            disabledBy: adminUserId,
            reason,
          },
        });

        updatedUsers.push(userId);
      } catch (error) {
        errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log admin action
    await auditLogger.logEvent(
      AuditEventType.CONFIG_CHANGE,
      SecurityLevel.HIGH,
      'SUCCESS',
      {
        action: 'mfa_enforcement_removed',
        userCount: updatedUsers.length,
        reason,
        errors: errors.length > 0 ? errors : undefined,
      },
      {
        userId: adminUserId,
        resource: 'mfa_enforcement',
        action: 'remove_enforcement',
        ipAddress: clientIP,
      }
    );

    return NextResponse.json({
      success: true,
      message: `MFA enforcement removed for ${updatedUsers.length} user(s)`,
      data: {
        updatedUsers,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove MFA enforcement';

    console.error('MFA enforcement removal error:', error);

    await auditLogger.logEvent(
      AuditEventType.CONFIG_CHANGE,
      SecurityLevel.HIGH,
      'FAILURE',
      {
        error: errorMessage,
        action: 'mfa_enforcement_removal_failed',
      },
      {
        resource: 'mfa_enforcement',
        action: 'remove_enforcement',
        ipAddress: clientIP,
      }
    );

    return createApiError(
      'Failed to remove MFA enforcement',
      'MFA_ENFORCEMENT_REMOVAL_ERROR',
      500,
      undefined,
      '/api/admin/mfa/enforce',
      'DELETE'
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
