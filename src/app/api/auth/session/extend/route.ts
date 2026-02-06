/**
 * Session Extension API Route
 * Extends user session when they choose to stay logged in
 *
 * POST /api/auth/session/extend - Extend current session
 *
 * Features:
 * - Refresh session expiry
 * - Update last activity timestamp
 * - Generate new access token
 * - Audit session extension
 *
 * Issue #28: Session Timeout Controls (P2)
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-local-development-only';
const SESSION_EXTENSION_MINUTES = parseInt(process.env.SESSION_EXTENSION_MINUTES || '30');

interface SessionExtensionRequest {
  refreshToken?: string;
}

interface SessionExtensionResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  expiresAt?: string;
  extendedMinutes?: number;
}

/**
 * POST /api/auth/session/extend
 * Extend current session
 */
export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Get current session from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify current token (even if expired, we'll check)
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      // Token expired or invalid
      // Check if it's just expired (we can extend) or truly invalid
      try {
        decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

        // Check if token is too old to extend (e.g., more than 1 day)
        const tokenAge = Date.now() / 1000 - decoded.iat;
        if (tokenAge > 86400) { // 24 hours
          return NextResponse.json(
            {
              success: false,
              message: 'Session too old to extend. Please login again.',
            },
            { status: 401 }
          );
        }
      } catch (verifyError) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid session token',
          },
          { status: 401 }
        );
      }
    }

    // Generate new token with extended expiry
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = SESSION_EXTENSION_MINUTES * 60; // Convert to seconds
    const expiresAt = now + expiresIn;

    const newTokenPayload = {
      userId: decoded.userId || decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
      sessionId: decoded.sessionId,
      iat: now,
      exp: expiresAt,
    };

    const newAccessToken = jwt.sign(newTokenPayload, JWT_SECRET);

    // Update session in database
    // TODO: Implement database update for session last_activity_at
    // await updateSessionActivity(decoded.sessionId);

    // Log session extension
    await auditLogger.logEvent(
      AuditEventType.TOKEN_REFRESH,
      SecurityLevel.LOW,
      'SUCCESS',
      {
        action: 'session_extended',
        sessionId: decoded.sessionId,
        extendedMinutes: SESSION_EXTENSION_MINUTES,
        userAgent,
      },
      {
        userId: decoded.userId || decoded.user_id,
        sessionId: decoded.sessionId,
        resource: 'session',
        action: 'extend',
        ipAddress: clientIP,
      }
    );

    const response: SessionExtensionResponse = {
      success: true,
      message: 'Session extended successfully',
      accessToken: newAccessToken,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      extendedMinutes: SESSION_EXTENSION_MINUTES,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Session extension failed';

    console.error('Session extension error:', error);

    await auditLogger.logEvent(
      AuditEventType.TOKEN_REFRESH,
      SecurityLevel.MEDIUM,
      'FAILURE',
      {
        error: errorMessage,
        action: 'session_extension_failed',
        userAgent,
      },
      {
        resource: 'session',
        action: 'extend',
        ipAddress: clientIP,
      }
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to extend session',
      },
      { status: 500 }
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
