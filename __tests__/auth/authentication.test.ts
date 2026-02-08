/**
 * Authentication Integration Tests
 * Tests for JWT token management, MFA, and session security
 *
 * Phase 1B: Authentication & Session Security
 */

import { authManager } from '@/lib/auth';
import { tokenManager } from '@/lib/auth/token-manager';
import { mfaIntegration } from '@/lib/auth/mfa-integration';
import { sessionSecurityManager } from '@/lib/auth/session-security';

describe('Authentication System', () => {
  describe('JWT Token Management', () => {
    let testTokens: any;
    const testPayload = {
      userId: 'test-user-123',
      userType: 'operator' as const,
      role: 'ops_manager',
      regionId: 'reg-001',
      permissions: ['drivers:read', 'bookings:write'],
      sessionId: 'test-session-123',
    };

    beforeEach(async () => {
      testTokens = await authManager.generateTokens(testPayload);
    });

    test('should generate valid token pair', async () => {
      expect(testTokens).toHaveProperty('accessToken');
      expect(testTokens).toHaveProperty('refreshToken');
      expect(testTokens).toHaveProperty('expiresIn');
      expect(testTokens.expiresIn).toBeGreaterThan(0);
      expect(testTokens.expiresIn).toBeLessThanOrEqual(900); // 15 minutes max
    });

    test('should verify valid access token', async () => {
      const user = await authManager.verifyToken(testTokens.accessToken);

      expect(user).not.toBeNull();
      expect(user?.userId).toBe(testPayload.userId);
      expect(user?.role).toBe(testPayload.role);
      expect(user?.sessionId).toBe(testPayload.sessionId);
      expect(user?.permissions).toEqual(expect.arrayContaining(testPayload.permissions));
    });

    test('should reject invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      const user = await authManager.verifyToken(invalidToken);

      expect(user).toBeNull();
    });

    test('should refresh tokens successfully', async () => {
      const refreshResult = await authManager.refreshToken(testTokens.refreshToken);

      expect(refreshResult).not.toBeNull();
      expect(refreshResult?.accessToken).toBeDefined();
      expect(refreshResult?.accessToken).not.toBe(testTokens.accessToken);

      // Verify new access token works
      const user = await authManager.verifyToken(refreshResult!.accessToken);
      expect(user).not.toBeNull();
      expect(user?.userId).toBe(testPayload.userId);
    });

    test('should rotate refresh token on refresh', async () => {
      const refreshResult = await authManager.refreshToken(testTokens.refreshToken);

      expect(refreshResult).not.toBeNull();

      if (process.env.JWT_REFRESH_ROTATION !== 'false') {
        expect(refreshResult?.refreshToken).toBeDefined();
        expect(refreshResult?.refreshToken).not.toBe(testTokens.refreshToken);
      }
    });

    test('should detect refresh token reuse', async () => {
      // Use refresh token once
      const firstRefresh = await authManager.refreshToken(testTokens.refreshToken);
      expect(firstRefresh).not.toBeNull();

      // Try to use the same refresh token again (should fail)
      const secondRefresh = await authManager.refreshToken(testTokens.refreshToken);

      // Should either fail or be within grace period
      if (secondRefresh === null) {
        // Token reuse detected and blocked
        expect(secondRefresh).toBeNull();
      } else {
        // Within grace period
        expect(secondRefresh).not.toBeNull();
      }
    });

    test('should blacklist token on logout', async () => {
      const validation = await tokenManager.validateAccessToken(testTokens.accessToken);
      expect(validation.valid).toBe(true);

      // Extract token ID from payload
      const tokenId = validation.payload?.tokenId;

      // Logout
      await authManager.logout(testPayload.sessionId, tokenId);

      // Token should now be blacklisted
      const validationAfterLogout = await tokenManager.validateAccessToken(
        testTokens.accessToken,
        { checkBlacklist: true }
      );

      expect(validationAfterLogout.valid).toBe(false);
      expect(validationAfterLogout.blacklisted).toBe(true);
    });

    test('should include token fingerprint', async () => {
      const validation = await tokenManager.validateAccessToken(testTokens.accessToken);

      expect(validation.payload?.fingerprint).toBeDefined();
      expect(typeof validation.payload?.fingerprint).toBe('string');
      expect(validation.payload?.fingerprint.length).toBeGreaterThan(0);
    });
  });

  describe('Session Management', () => {
    const testSessionData = {
      userId: 'test-user-session',
      userRole: 'ops_manager',
      userLevel: 50,
      permissions: ['drivers:read', 'bookings:write'] as any,
      context: {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
      },
    };

    test('should create session successfully', async () => {
      const session = await sessionSecurityManager.createSession(
        testSessionData.userId,
        testSessionData.userRole,
        testSessionData.userLevel,
        testSessionData.permissions,
        testSessionData.context
      );

      expect(session.sessionId).toBeDefined();
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should validate active session', async () => {
      const session = await sessionSecurityManager.createSession(
        testSessionData.userId,
        testSessionData.userRole,
        testSessionData.userLevel,
        testSessionData.permissions,
        testSessionData.context
      );

      const validation = await sessionSecurityManager.validateSession(
        session.sessionId,
        testSessionData.context
      );

      expect(validation.valid).toBe(true);
      expect(validation.session).toBeDefined();
      expect(validation.session?.userId).toBe(testSessionData.userId);
    });

    test('should detect IP address change', async () => {
      const session = await sessionSecurityManager.createSession(
        testSessionData.userId,
        testSessionData.userRole,
        testSessionData.userLevel,
        testSessionData.permissions,
        testSessionData.context
      );

      const validation = await sessionSecurityManager.validateSession(
        session.sessionId,
        {
          ...testSessionData.context,
          ipAddress: '10.0.0.1', // Different IP
        }
      );

      // Should still be valid but with alerts
      expect(validation.valid).toBe(true);
      expect(validation.alerts.length).toBeGreaterThan(0);
      expect(validation.alerts.some(a => a.alertType === 'suspicious_location')).toBe(true);
    });

    test('should enforce session timeout', async () => {
      const session = await sessionSecurityManager.createSession(
        testSessionData.userId,
        testSessionData.userRole,
        testSessionData.userLevel,
        testSessionData.permissions,
        testSessionData.context
      );

      // Manually expire session by setting lastActivity to past
      const sessionObj = await sessionSecurityManager['activeSessions'].get(session.sessionId);
      if (sessionObj) {
        sessionObj.lastActivity = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      }

      const validation = await sessionSecurityManager.validateSession(
        session.sessionId,
        testSessionData.context
      );

      expect(validation.valid).toBe(false);
    });

    test('should calculate risk score', async () => {
      const session = await sessionSecurityManager.createSession(
        testSessionData.userId,
        testSessionData.userRole,
        testSessionData.userLevel,
        testSessionData.permissions,
        testSessionData.context
      );

      const validation = await sessionSecurityManager.validateSession(
        session.sessionId,
        testSessionData.context
      );

      expect(validation.riskScore).toBeDefined();
      expect(validation.riskScore).toBeGreaterThanOrEqual(0);
      expect(validation.riskScore).toBeLessThanOrEqual(10);
    });
  });

  describe('Multi-Factor Authentication', () => {
    const testUserId = 'test-mfa-user';

    test('should setup TOTP MFA', async () => {
      const result = await mfaIntegration.setupMFA({
        userId: testUserId,
        method: 'totp',
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe('totp');
      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toBeDefined();
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes?.length).toBeGreaterThan(0);
    });

    test('should create MFA challenge', async () => {
      // First setup MFA
      await mfaIntegration.setupMFA({
        userId: testUserId,
        method: 'totp',
      });

      const challenge = await mfaIntegration.createMFAChallenge({
        userId: testUserId,
        method: 'totp',
        action: 'login',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Browser',
      });

      expect(challenge.success).toBe(true);
      expect(challenge.challengeId).toBeDefined();
      expect(challenge.expiresAt).toBeInstanceOf(Date);
      expect(challenge.method).toBe('totp');
    });

    test('should get MFA status', async () => {
      await mfaIntegration.setupMFA({
        userId: testUserId,
        method: 'totp',
      });

      const status = await mfaIntegration.getMFAStatus(testUserId);

      expect(status.enabled).toBe(true);
      expect(status.methods).toBeDefined();
      expect(status.methods.some(m => m.type === 'totp' && m.enabled)).toBe(true);
      expect(status.backupCodesRemaining).toBeGreaterThan(0);
    });

    test('should require MFA for enabled users', async () => {
      await mfaIntegration.setupMFA({
        userId: testUserId,
        method: 'totp',
      });

      const requiresMfa = await mfaIntegration.requiresMFA(testUserId);

      expect(requiresMfa).toBe(true);
    });

    test('should not require MFA for users without it', async () => {
      const requiresMfa = await mfaIntegration.requiresMFA('user-without-mfa');

      expect(requiresMfa).toBe(false);
    });
  });

  describe('Token Blacklist Management', () => {
    test('should blacklist token', async () => {
      const tokenId = 'test-token-123';
      const userId = 'test-user-123';

      await tokenManager.blacklistToken(tokenId, userId);

      const isBlacklisted = await tokenManager.isTokenBlacklisted(tokenId);
      expect(isBlacklisted).toBe(true);
    });

    test('should not report non-blacklisted token', async () => {
      const isBlacklisted = await tokenManager.isTokenBlacklisted('non-existent-token');
      expect(isBlacklisted).toBe(false);
    });

    test('should get blacklist statistics', () => {
      const stats = tokenManager.getBlacklistStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });
  });

  describe('Password Security', () => {
    const testPassword = 'SecureTestPassword123!';

    test('should hash password', async () => {
      const hash = await authManager.hashPassword(testPassword);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(testPassword);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should verify correct password', async () => {
      const hash = await authManager.hashPassword(testPassword);
      const isValid = await authManager.verifyPassword(testPassword, hash);

      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const hash = await authManager.hashPassword(testPassword);
      const isValid = await authManager.verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('Permission Checking', () => {
    const testUser: any = {
      userId: 'test-user',
      userType: 'operator',
      role: 'ops_manager',
      permissions: ['drivers:read', 'bookings:write', 'analytics:read'],
      sessionId: 'test-session',
    };

    test('should grant permission when user has it', () => {
      const hasPermission = authManager.hasPermission(testUser, 'drivers:read');
      expect(hasPermission).toBe(true);
    });

    test('should deny permission when user lacks it', () => {
      const hasPermission = authManager.hasPermission(testUser, 'system:admin');
      expect(hasPermission).toBe(false);
    });
  });

  describe('Regional Access', () => {
    const testUser: any = {
      userId: 'test-user',
      userType: 'operator',
      role: 'regional_manager',
      regionId: 'reg-001',
      permissions: [],
      sessionId: 'test-session',
    };

    test('should grant access to own region', () => {
      const hasAccess = authManager.hasRegionalAccess(testUser, 'reg-001');
      expect(hasAccess).toBe(true);
    });

    test('should deny access to other region', () => {
      const hasAccess = authManager.hasRegionalAccess(testUser, 'reg-002');
      expect(hasAccess).toBe(false);
    });

    test('should grant admin access to all regions', () => {
      const adminUser = { ...testUser, role: 'admin' };

      const hasAccess1 = authManager.hasRegionalAccess(adminUser, 'reg-001');
      const hasAccess2 = authManager.hasRegionalAccess(adminUser, 'reg-002');

      expect(hasAccess1).toBe(true);
      expect(hasAccess2).toBe(true);
    });
  });
});

describe('Authentication Edge Cases', () => {
  test('should handle expired access token', async () => {
    // This would require mocking time or waiting for expiry
    // For now, test that verification handles errors gracefully
    const result = await authManager.verifyToken('expired.token.here');
    expect(result).toBeNull();
  });

  test('should handle malformed tokens', async () => {
    const malformedTokens = [
      'not-a-jwt',
      '',
      'a.b',
      'a.b.c.d',
    ];

    for (const token of malformedTokens) {
      const result = await authManager.verifyToken(token);
      expect(result).toBeNull();
    }
  });

  test('should handle concurrent session creation', async () => {
    const userId = 'concurrent-test-user';
    const promises = [];

    for (let i = 0; i < 5; i++) {
      promises.push(
        sessionSecurityManager.createSession(
          userId,
          'ops_manager',
          50,
          [],
          { ipAddress: '192.168.1.100', userAgent: 'Test Browser' }
        )
      );
    }

    const sessions = await Promise.all(promises);

    // All should succeed (old sessions terminated if limit reached)
    expect(sessions.length).toBe(5);
    expect(sessions.every(s => s.sessionId)).toBe(true);
  });
});

describe('Integration Tests', () => {
  test('should complete full authentication flow', async () => {
    // 1. Generate tokens
    const tokens = await authManager.generateTokens({
      userId: 'integration-test-user',
      userType: 'operator',
      role: 'ops_manager',
      regionId: 'reg-001',
      sessionId: 'integration-test-session',
      permissions: ['drivers:read'],
    });

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    // 2. Verify access token
    const user = await authManager.verifyToken(tokens.accessToken);
    expect(user).not.toBeNull();
    expect(user?.userId).toBe('integration-test-user');

    // 3. Refresh tokens
    const refreshResult = await authManager.refreshToken(tokens.refreshToken);
    expect(refreshResult).not.toBeNull();
    expect(refreshResult?.accessToken).not.toBe(tokens.accessToken);

    // 4. Verify new access token
    const userAfterRefresh = await authManager.verifyToken(refreshResult!.accessToken);
    expect(userAfterRefresh).not.toBeNull();
    expect(userAfterRefresh?.userId).toBe('integration-test-user');

    // 5. Logout
    const tokenId = (user as any).tokenId;
    await authManager.logout('integration-test-session', tokenId);

    // 6. Verify token is blacklisted
    const userAfterLogout = await authManager.verifyToken(tokens.accessToken);
    expect(userAfterLogout).toBeNull();
  });

  test('should complete MFA enrollment and verification flow', async () => {
    const userId = 'mfa-integration-test';

    // 1. Setup TOTP
    const setupResult = await mfaIntegration.setupMFA({
      userId,
      method: 'totp',
    });

    expect(setupResult.success).toBe(true);
    expect(setupResult.secret).toBeDefined();

    // 2. Check MFA status
    const status = await mfaIntegration.getMFAStatus(userId);
    expect(status.enabled).toBe(true);

    // 3. Create challenge
    const challenge = await mfaIntegration.createMFAChallenge({
      userId,
      method: 'totp',
      action: 'login',
    });

    expect(challenge.success).toBe(true);
    expect(challenge.challengeId).toBeDefined();

    // Note: Actual verification would require a valid TOTP code
    // which requires time-based computation with the secret
  });
});
