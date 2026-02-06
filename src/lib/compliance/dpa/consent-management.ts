/**
 * DPA Consent Management Service
 *
 * Handles consent tracking, withdrawal, and compliance for DPA
 *
 * @module lib/compliance/dpa/consent-management
 */

import { query } from '@/lib/db';
import type {
  DPAConsent,
  ConsentRequest,
  ConsentResponse,
  ConsentStatistics,
  ConsentType,
} from './types';

// =====================================================
// CONSENT MANAGEMENT SERVICE
// =====================================================

export class DPAConsentService {
  /**
   * Record user consent
   */
  async recordConsent(request: ConsentRequest): Promise<ConsentResponse> {
    try {
      const result = await query<DPAConsent>(
        `INSERT INTO dpa_consents (
          user_id,
          user_type,
          consent_type,
          consent_given,
          consent_version,
          purpose,
          scope,
          consent_method,
          source_page,
          source_action,
          user_agent,
          ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          request.userId,
          request.userType,
          request.consentType,
          request.consentGiven,
          request.consentVersion,
          request.purpose,
          JSON.stringify(request.scope || {}),
          request.consentMethod,
          request.sourcePage,
          request.sourceAction,
          request.userAgent,
          request.ipAddress,
        ]
      );

      return {
        success: true,
        consent: this.mapConsent(result.rows[0]),
      };
    } catch (error) {
      console.error('Error recording consent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record consent',
      };
    }
  }

  /**
   * Get user consents
   */
  async getUserConsents(
    userId: string,
    consentType?: ConsentType
  ): Promise<DPAConsent[]> {
    try {
      let sql = `
        SELECT * FROM dpa_consents
        WHERE user_id = $1
      `;
      const params: any[] = [userId];

      if (consentType) {
        sql += ` AND consent_type = $2`;
        params.push(consentType);
      }

      sql += ` ORDER BY created_at DESC`;

      const result = await query<DPAConsent>(sql, params);
      return result.rows.map(this.mapConsent);
    } catch (error) {
      console.error('Error fetching user consents:', error);
      return [];
    }
  }

  /**
   * Check if user has given consent
   */
  async hasConsent(
    userId: string,
    consentType: ConsentType
  ): Promise<boolean> {
    try {
      const result = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM dpa_consents
         WHERE user_id = $1
           AND consent_type = $2
           AND consent_given = true
           AND withdrawn = false
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [userId, consentType]
      );

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false;
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    reason?: string
  ): Promise<ConsentResponse> {
    try {
      const result = await query<DPAConsent>(
        `UPDATE dpa_consents
         SET withdrawn = true,
             withdrawn_at = NOW(),
             withdrawal_reason = $3,
             updated_at = NOW()
         WHERE user_id = $1
           AND consent_type = $2
           AND consent_given = true
           AND withdrawn = false
         RETURNING *`,
        [userId, consentType, reason]
      );

      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'No active consent found to withdraw',
        };
      }

      return {
        success: true,
        consent: this.mapConsent(result.rows[0]),
      };
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to withdraw consent',
      };
    }
  }

  /**
   * Update consent (e.g., for new policy version)
   */
  async updateConsent(
    userId: string,
    consentType: ConsentType,
    consentGiven: boolean,
    newVersion: string
  ): Promise<ConsentResponse> {
    try {
      // Withdraw old consent
      await query(
        `UPDATE dpa_consents
         SET withdrawn = true,
             withdrawn_at = NOW(),
             withdrawal_reason = 'Updated to version ' || $3
         WHERE user_id = $1
           AND consent_type = $2
           AND withdrawn = false`,
        [userId, consentType, newVersion]
      );

      // Create new consent record
      const result = await query<DPAConsent>(
        `INSERT INTO dpa_consents (
          user_id,
          user_type,
          consent_type,
          consent_given,
          consent_version,
          purpose,
          consent_method
        )
        SELECT user_id, user_type, consent_type, $4, $3, purpose, 'explicit'
        FROM dpa_consents
        WHERE user_id = $1 AND consent_type = $2
        ORDER BY created_at DESC
        LIMIT 1
        RETURNING *`,
        [userId, consentType, newVersion, consentGiven]
      );

      return {
        success: true,
        consent: this.mapConsent(result.rows[0]),
      };
    } catch (error) {
      console.error('Error updating consent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update consent',
      };
    }
  }

  /**
   * Get consent statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ConsentStatistics> {
    try {
      let sql = `
        SELECT
          COUNT(*) as total_consents,
          COUNT(*) FILTER (WHERE consent_given = true AND withdrawn = false AND (expires_at IS NULL OR expires_at > NOW())) as active_consents,
          COUNT(*) FILTER (WHERE withdrawn = true) as withdrawn_consents,
          COUNT(*) FILTER (WHERE expires_at < NOW() AND withdrawn = false) as expired_consents,
          consent_type,
          COUNT(*) as count_by_type
        FROM dpa_consents
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      if (startDate) {
        conditions.push(`created_at >= $${params.length + 1}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`created_at <= $${params.length + 1}`);
        params.push(endDate);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ` GROUP BY consent_type`;

      const result = await query<any>(sql, params);

      const stats: ConsentStatistics = {
        totalConsents: 0,
        activeConsents: 0,
        withdrawnConsents: 0,
        expiredConsents: 0,
        consentsByType: {} as Record<ConsentType, number>,
        acceptanceRate: 0,
      };

      for (const row of result.rows) {
        stats.totalConsents += parseInt(row.total_consents);
        stats.activeConsents += parseInt(row.active_consents);
        stats.withdrawnConsents += parseInt(row.withdrawn_consents);
        stats.expiredConsents += parseInt(row.expired_consents);
        stats.consentsByType[row.consent_type as ConsentType] = parseInt(
          row.count_by_type
        );
      }

      stats.acceptanceRate =
        stats.totalConsents > 0
          ? (stats.activeConsents / stats.totalConsents) * 100
          : 0;

      return stats;
    } catch (error) {
      console.error('Error fetching consent statistics:', error);
      return {
        totalConsents: 0,
        activeConsents: 0,
        withdrawnConsents: 0,
        expiredConsents: 0,
        consentsByType: {} as Record<ConsentType, number>,
        acceptanceRate: 0,
      };
    }
  }

  /**
   * Check for expiring consents and send reminders
   */
  async checkExpiringConsents(daysBeforeExpiry: number = 30): Promise<DPAConsent[]> {
    try {
      const result = await query<DPAConsent>(
        `SELECT * FROM dpa_consents
         WHERE consent_given = true
           AND withdrawn = false
           AND expires_at IS NOT NULL
           AND expires_at > NOW()
           AND expires_at <= NOW() + INTERVAL '${daysBeforeExpiry} days'
         ORDER BY expires_at ASC`
      );

      return result.rows.map(this.mapConsent);
    } catch (error) {
      console.error('Error checking expiring consents:', error);
      return [];
    }
  }

  /**
   * Bulk consent withdrawal (for data deletion requests)
   */
  async withdrawAllConsents(userId: string, reason: string): Promise<number> {
    try {
      const result = await query(
        `UPDATE dpa_consents
         SET withdrawn = true,
             withdrawn_at = NOW(),
             withdrawal_reason = $2
         WHERE user_id = $1
           AND withdrawn = false`,
        [userId, reason]
      );

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error withdrawing all consents:', error);
      return 0;
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private mapConsent(row: any): DPAConsent {
    return {
      id: row.id,
      userId: row.user_id,
      userType: row.user_type,
      consentType: row.consent_type,
      consentGiven: row.consent_given,
      consentVersion: row.consent_version,
      purpose: row.purpose,
      scope: typeof row.scope === 'string' ? JSON.parse(row.scope) : row.scope,
      consentMethod: row.consent_method,
      sourcePage: row.source_page,
      sourceAction: row.source_action,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      withdrawn: row.withdrawn,
      withdrawnAt: row.withdrawn_at ? new Date(row.withdrawn_at) : undefined,
      withdrawalReason: row.withdrawal_reason,
      consentProof:
        typeof row.consent_proof === 'string'
          ? JSON.parse(row.consent_proof)
          : row.consent_proof,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      autoRenew: row.auto_renew,
      consentedAt: new Date(row.consented_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let consentServiceInstance: DPAConsentService | null = null;

export function getDPAConsentService(): DPAConsentService {
  if (!consentServiceInstance) {
    consentServiceInstance = new DPAConsentService();
  }
  return consentServiceInstance;
}
