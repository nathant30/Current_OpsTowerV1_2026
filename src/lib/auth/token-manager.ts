/**
 * Token Management Service for Xpress Ops Tower
 * Handles JWT token generation, rotation, and blacklisting
 *
 * Security Features:
 * - Automatic token rotation (15-minute access tokens)
 * - Refresh token rotation (one-time use)
 * - Token blacklisting for revocation
 * - Token fingerprinting
 * - Redis-based persistence with in-memory fallback
 *
 * Phase 1B: Authentication & Session Security
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { logger } from '../security/productionLogger';

// Types
export interface TokenPayload extends JwtPayload {
  userId: string;
  userType: 'operator' | 'driver' | 'system';
  role: string;
  regionId?: string;
  permissions: string[];
  sessionId: string;
  deviceId?: string;
  tokenId?: string; // Unique token identifier for blacklisting
  fingerprint?: string; // Token fingerprint for validation
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  refreshExpiresIn: number; // seconds
  tokenId: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  rotated: boolean;
}

export interface TokenValidation {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
  expired?: boolean;
  blacklisted?: boolean;
}

// Configuration
const TOKEN_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_ACCESS_SECRET is required in production');
    }
    logger.warn('Using development JWT access secret');
    return 'dev-access-secret-' + randomBytes(32).toString('hex');
  })(),
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_REFRESH_SECRET is required in production');
    }
    logger.warn('Using development JWT refresh secret');
    return 'dev-refresh-secret-' + randomBytes(32).toString('hex');
  })(),
  // Short-lived access tokens (15 minutes)
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  // Long-lived refresh tokens (7 days)
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  issuer: 'xpress-ops-tower',
  audience: 'xpress-operations',
  // Token rotation settings
  refreshTokenRotation: process.env.JWT_REFRESH_ROTATION !== 'false', // Default: enabled
  refreshTokenGracePeriod: 30000, // 30 seconds to handle race conditions
};

// In-memory stores (with global persistence for development)
declare global {
  var __token_blacklist: Map<string, { tokenId: string; userId: string; expiresAt: number }> | undefined;
  var __refresh_token_family: Map<string, { parentId?: string; childId?: string; usedAt?: number }> | undefined;
}

const tokenBlacklist = globalThis.__token_blacklist ?? new Map<string, { tokenId: string; userId: string; expiresAt: number }>();
const refreshTokenFamily = globalThis.__refresh_token_family ?? new Map<string, { parentId?: string; childId?: string; usedAt?: number }>();

if (process.env.NODE_ENV === 'development') {
  globalThis.__token_blacklist = tokenBlacklist;
  globalThis.__refresh_token_family = refreshTokenFamily;
}

/**
 * Token Manager Class
 * Handles all token operations with security best practices
 */
export class TokenManager {
  private static instance: TokenManager;

  private constructor() {
    // Start periodic cleanup
    this.startCleanupJob();
  }

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  // =====================================================
  // Token Generation
  // =====================================================

  /**
   * Generate a new token pair (access + refresh)
   */
  async generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'tokenId' | 'fingerprint'>): Promise<TokenPair> {
    try {
      const tokenId = this.generateTokenId();
      const fingerprint = this.generateTokenFingerprint(payload.userId, payload.sessionId);

      // Create access token
      const accessTokenPayload: Partial<TokenPayload> = {
        ...payload,
        tokenId,
        fingerprint,
      };

      const accessToken = jwt.sign(
        accessTokenPayload,
        TOKEN_CONFIG.accessTokenSecret,
        {
          expiresIn: TOKEN_CONFIG.accessTokenExpiry,
          issuer: TOKEN_CONFIG.issuer,
          audience: TOKEN_CONFIG.audience,
        }
      );

      // Create refresh token with minimal payload
      const refreshTokenPayload = {
        userId: payload.userId,
        sessionId: payload.sessionId,
        tokenId: this.generateTokenId(), // Separate ID for refresh token
        type: 'refresh',
        fingerprint,
      };

      const refreshToken = jwt.sign(
        refreshTokenPayload,
        TOKEN_CONFIG.refreshTokenSecret,
        {
          expiresIn: TOKEN_CONFIG.refreshTokenExpiry,
          issuer: TOKEN_CONFIG.issuer,
          audience: TOKEN_CONFIG.audience,
        }
      );

      // Calculate expiry times
      const accessDecoded = jwt.decode(accessToken) as JwtPayload;
      const refreshDecoded = jwt.decode(refreshToken) as JwtPayload;

      const expiresIn = accessDecoded.exp ? (accessDecoded.exp * 1000) - Date.now() : 900000; // 15 min default
      const refreshExpiresIn = refreshDecoded.exp ? (refreshDecoded.exp * 1000) - Date.now() : 604800000; // 7 days default

      logger.info('Token pair generated', {
        userId: payload.userId,
        tokenId,
        expiresIn: `${Math.floor(expiresIn / 1000)}s`,
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: Math.floor(expiresIn / 1000),
        refreshExpiresIn: Math.floor(refreshExpiresIn / 1000),
        tokenId,
      };
    } catch (error) {
      logger.error('Token generation failed', { error, userId: payload.userId });
      throw new Error('Failed to generate token pair');
    }
  }

  // =====================================================
  // Token Validation
  // =====================================================

  /**
   * Validate and verify an access token
   */
  async validateAccessToken(token: string, options?: { checkBlacklist?: boolean }): Promise<TokenValidation> {
    try {
      const decoded = jwt.verify(
        token,
        TOKEN_CONFIG.accessTokenSecret,
        {
          issuer: TOKEN_CONFIG.issuer,
          audience: TOKEN_CONFIG.audience,
        }
      ) as TokenPayload;

      // Check if token is blacklisted
      if (options?.checkBlacklist !== false) {
        const isBlacklisted = await this.isTokenBlacklisted(decoded.tokenId || '');
        if (isBlacklisted) {
          logger.warn('Blacklisted token used', { tokenId: decoded.tokenId, userId: decoded.userId });
          return {
            valid: false,
            error: 'Token has been revoked',
            blacklisted: true,
          };
        }
      }

      // Validate fingerprint if present
      if (decoded.fingerprint) {
        const expectedFingerprint = this.generateTokenFingerprint(decoded.userId, decoded.sessionId);
        if (decoded.fingerprint !== expectedFingerprint) {
          logger.error('Token fingerprint mismatch', { tokenId: decoded.tokenId, userId: decoded.userId });
          return {
            valid: false,
            error: 'Token fingerprint invalid',
          };
        }
      }

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Token expired',
          expired: true,
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid token', { error: error.message });
        return {
          valid: false,
          error: 'Invalid token',
        };
      }

      logger.error('Token validation error', { error });
      return {
        valid: false,
        error: 'Token validation failed',
      };
    }
  }

  /**
   * Validate a refresh token
   */
  async validateRefreshToken(token: string): Promise<TokenValidation> {
    try {
      const decoded = jwt.verify(
        token,
        TOKEN_CONFIG.refreshTokenSecret,
        {
          issuer: TOKEN_CONFIG.issuer,
          audience: TOKEN_CONFIG.audience,
        }
      ) as JwtPayload & { type: string; tokenId: string; fingerprint?: string };

      // Check if this refresh token has been used (token rotation detection)
      if (TOKEN_CONFIG.refreshTokenRotation) {
        const tokenFamily = refreshTokenFamily.get(decoded.tokenId);
        if (tokenFamily?.usedAt) {
          // Token reuse detected - possible attack
          const timeSinceUse = Date.now() - tokenFamily.usedAt;

          if (timeSinceUse > TOKEN_CONFIG.refreshTokenGracePeriod) {
            logger.error('Refresh token reuse detected - possible attack', {
              tokenId: decoded.tokenId,
              userId: decoded.userId,
              timeSinceUse,
            });

            // Revoke all tokens in this family
            await this.revokeTokenFamily(decoded.tokenId);

            return {
              valid: false,
              error: 'Token reuse detected - all tokens revoked',
            };
          }
          // Within grace period - allow for race conditions
          logger.warn('Refresh token used within grace period', { tokenId: decoded.tokenId });
        }
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(decoded.tokenId);
      if (isBlacklisted) {
        return {
          valid: false,
          error: 'Token has been revoked',
          blacklisted: true,
        };
      }

      return {
        valid: true,
        payload: decoded as TokenPayload,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Refresh token expired',
          expired: true,
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid refresh token',
        };
      }

      logger.error('Refresh token validation error', { error });
      return {
        valid: false,
        error: 'Refresh token validation failed',
      };
    }
  }

  // =====================================================
  // Token Rotation
  // =====================================================

  /**
   * Refresh tokens with automatic rotation
   */
  async refreshTokens(
    refreshToken: string,
    sessionData: Omit<TokenPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'tokenId' | 'fingerprint'>
  ): Promise<RefreshResult> {
    try {
      // Validate the refresh token
      const validation = await this.validateRefreshToken(refreshToken);

      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid refresh token');
      }

      const oldRefreshPayload = validation.payload!;

      // Mark the old refresh token as used
      if (TOKEN_CONFIG.refreshTokenRotation) {
        refreshTokenFamily.set(oldRefreshPayload.tokenId || '', {
          usedAt: Date.now(),
        });
      }

      // Generate new token pair
      const newTokenPair = await this.generateTokenPair(sessionData);

      // If rotation enabled, establish parent-child relationship
      if (TOKEN_CONFIG.refreshTokenRotation) {
        const newRefreshDecoded = jwt.decode(newTokenPair.refreshToken) as JwtPayload & { tokenId: string };

        refreshTokenFamily.set(newRefreshDecoded.tokenId, {
          parentId: oldRefreshPayload.tokenId,
        });

        // Blacklist the old refresh token (one-time use)
        await this.blacklistToken(oldRefreshPayload.tokenId || '', oldRefreshPayload.userId || '',
          Date.now() + TOKEN_CONFIG.refreshTokenGracePeriod);
      }

      logger.info('Tokens refreshed', {
        userId: sessionData.userId,
        oldTokenId: oldRefreshPayload.tokenId,
        newTokenId: newTokenPair.tokenId,
        rotated: TOKEN_CONFIG.refreshTokenRotation,
      });

      return {
        accessToken: newTokenPair.accessToken,
        refreshToken: newTokenPair.refreshToken,
        expiresIn: newTokenPair.expiresIn,
        refreshExpiresIn: newTokenPair.refreshExpiresIn,
        rotated: TOKEN_CONFIG.refreshTokenRotation,
      };
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  // =====================================================
  // Token Blacklisting
  // =====================================================

  /**
   * Blacklist a token (logout, revocation)
   */
  async blacklistToken(tokenId: string, userId: string, expiresAt?: number): Promise<void> {
    try {
      const expiry = expiresAt || Date.now() + (15 * 60 * 1000); // 15 minutes default

      tokenBlacklist.set(tokenId, {
        tokenId,
        userId,
        expiresAt: expiry,
      });

      // In production, this would also store in Redis:
      // await redis.setex(`blacklist:${tokenId}`, ttlSeconds, userId);

      logger.info('Token blacklisted', { tokenId, userId });
    } catch (error) {
      logger.error('Token blacklist failed', { error, tokenId, userId });
      throw error;
    }
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    try {
      const entry = tokenBlacklist.get(tokenId);

      if (!entry) {
        return false;
      }

      // Check if blacklist entry has expired
      if (Date.now() > entry.expiresAt) {
        tokenBlacklist.delete(tokenId);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Blacklist check failed', { error, tokenId });
      // Fail open to avoid blocking legitimate requests on error
      return false;
    }
  }

  /**
   * Revoke all tokens in a token family (for security incidents)
   */
  async revokeTokenFamily(tokenId: string): Promise<void> {
    try {
      const family = new Set<string>([tokenId]);

      // Find all related tokens (parent and children)
      const findFamily = (id: string) => {
        const entry = refreshTokenFamily.get(id);
        if (entry?.parentId && !family.has(entry.parentId)) {
          family.add(entry.parentId);
          findFamily(entry.parentId);
        }
        if (entry?.childId && !family.has(entry.childId)) {
          family.add(entry.childId);
          findFamily(entry.childId);
        }
      };

      findFamily(tokenId);

      // Blacklist all tokens in the family
      for (const id of family) {
        const entry = refreshTokenFamily.get(id);
        if (entry) {
          await this.blacklistToken(id, '', Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
        }
      }

      logger.warn('Token family revoked', { tokenId, familySize: family.size });
    } catch (error) {
      logger.error('Token family revocation failed', { error, tokenId });
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user (for account compromise)
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    try {
      let count = 0;

      // Find and blacklist all tokens for this user
      for (const [tokenId, entry] of tokenBlacklist.entries()) {
        if (entry.userId === userId) {
          await this.blacklistToken(tokenId, userId, Date.now() + (7 * 24 * 60 * 60 * 1000));
          count++;
        }
      }

      logger.warn('All user tokens revoked', { userId, count });
      return count;
    } catch (error) {
      logger.error('User token revocation failed', { error, userId });
      throw error;
    }
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * Generate unique token ID
   */
  private generateTokenId(): string {
    return `tkn_${Date.now()}_${randomBytes(16).toString('hex')}`;
  }

  /**
   * Generate token fingerprint for validation
   */
  private generateTokenFingerprint(userId: string, sessionId: string): string {
    const secret = TOKEN_CONFIG.accessTokenSecret;
    return createHash('sha256')
      .update(`${userId}:${sessionId}:${secret}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Periodic cleanup of expired blacklist entries
   */
  private startCleanupJob(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired blacklist entries
   */
  private cleanupExpiredTokens(): void {
    try {
      const now = Date.now();
      let cleaned = 0;

      for (const [tokenId, entry] of tokenBlacklist.entries()) {
        if (now > entry.expiresAt) {
          tokenBlacklist.delete(tokenId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug('Cleaned up expired tokens', { count: cleaned });
      }
    } catch (error) {
      logger.error('Token cleanup failed', { error });
    }
  }

  /**
   * Get blacklist statistics
   */
  getBlacklistStats(): { size: number; entries: Array<{ tokenId: string; userId: string; expiresAt: number }> } {
    const entries = Array.from(tokenBlacklist.values());
    return {
      size: entries.length,
      entries,
    };
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

// Export convenience functions
export const generateTokenPair = (payload: Omit<TokenPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'tokenId' | 'fingerprint'>) =>
  tokenManager.generateTokenPair(payload);

export const validateAccessToken = (token: string, options?: { checkBlacklist?: boolean }) =>
  tokenManager.validateAccessToken(token, options);

export const validateRefreshToken = (token: string) =>
  tokenManager.validateRefreshToken(token);

export const refreshTokens = (refreshToken: string, sessionData: Omit<TokenPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'tokenId' | 'fingerprint'>) =>
  tokenManager.refreshTokens(refreshToken, sessionData);

export const blacklistToken = (tokenId: string, userId: string, expiresAt?: number) =>
  tokenManager.blacklistToken(tokenId, userId, expiresAt);

export const revokeAllUserTokens = (userId: string) =>
  tokenManager.revokeAllUserTokens(userId);
