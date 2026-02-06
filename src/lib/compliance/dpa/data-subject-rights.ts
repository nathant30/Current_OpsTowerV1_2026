/**
 * DPA Data Subject Rights Service
 *
 * Implements data subject rights under the Data Privacy Act:
 * - Right to Access (data export)
 * - Right to Rectification
 * - Right to Erasure (right to be forgotten)
 * - Right to Data Portability
 * - Right to Restriction
 * - Right to Object
 *
 * @module lib/compliance/dpa/data-subject-rights
 */

import { query } from '@/lib/db';
import type {
  DPADataRequest,
  DataRequestSubmission,
  DataRequestResponse,
  DataExportResponse,
  DataDeletionResponse,
  DataRequestStatistics,
} from './types';
import { getDPAConsentService } from './consent-management';

// =====================================================
// DATA SUBJECT RIGHTS SERVICE
// =====================================================

export class DataSubjectRightsService {
  /**
   * Submit a data subject request
   */
  async submitRequest(
    submission: DataRequestSubmission
  ): Promise<DataRequestResponse> {
    try {
      // Generate unique request ID
      const requestId = this.generateRequestId();

      const result = await query<DPADataRequest>(
        `INSERT INTO dpa_data_requests (
          request_id,
          user_id,
          user_type,
          user_email,
          user_phone,
          request_type,
          request_reason,
          specific_data_requested
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          requestId,
          submission.userId,
          submission.userType,
          submission.userEmail,
          submission.userPhone,
          submission.requestType,
          submission.requestReason,
          JSON.stringify(submission.specificDataRequested || []),
        ]
      );

      return {
        success: true,
        request: this.mapDataRequest(result.rows[0]),
        requestId,
      };
    } catch (error) {
      console.error('Error submitting data request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit request',
      };
    }
  }

  /**
   * Export user data (Right to Access)
   */
  async exportUserData(userId: string): Promise<DataExportResponse> {
    try {
      // Fetch all user data from various tables
      const [
        personalInfo,
        tripHistory,
        paymentHistory,
        preferences,
        consents,
        documents,
      ] = await Promise.all([
        this.getPersonalInfo(userId),
        this.getTripHistory(userId),
        this.getPaymentHistory(userId),
        this.getPreferences(userId),
        this.getConsents(userId),
        this.getDocuments(userId),
      ]);

      const exportData = {
        personalInfo,
        tripHistory,
        paymentHistory,
        preferences,
        consents,
        documents,
        exportedAt: new Date(),
      };

      // Log the export action
      await this.logAction(userId, 'data_export', 'User data exported');

      return {
        success: true,
        data: exportData,
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data',
      };
    }
  }

  /**
   * Delete user data (Right to Erasure / Right to be Forgotten)
   */
  async deleteUserData(userId: string, reason: string): Promise<DataDeletionResponse> {
    try {
      const deletedEntities = {
        personalInfo: false,
        tripHistory: 0,
        paymentHistory: 0,
        documents: 0,
        consents: 0,
      };

      // Check for legal holds or retention requirements
      const legalHolds = await this.checkLegalHolds(userId);

      if (legalHolds.hasHolds) {
        return {
          success: false,
          error: 'Cannot delete data: legal hold or retention requirement in place',
          retainedData: {
            legalHoldRecords: legalHolds.recordCount,
            archivedRecords: 0,
            reason: legalHolds.reason,
          },
        };
      }

      // Withdraw all consents
      const consentService = getDPAConsentService();
      deletedEntities.consents = await consentService.withdrawAllConsents(
        userId,
        `Data deletion request: ${reason}`
      );

      // Anonymize personal information (don't delete, anonymize for compliance)
      await query(
        `UPDATE users
         SET name = 'DELETED_USER',
             email = 'deleted_' || id || '@anonymized.local',
             phone = NULL,
             profile_photo = NULL,
             address = NULL,
             date_of_birth = NULL,
             deleted_at = NOW(),
             deletion_reason = $2
         WHERE id = $1`,
        [userId, reason]
      );
      deletedEntities.personalInfo = true;

      // Archive trip history (retain for compliance but mark as deleted)
      const tripResult = await query(
        `UPDATE rides
         SET passenger_anonymized = true,
             passenger_name = 'DELETED',
             passenger_phone = NULL,
             updated_at = NOW()
         WHERE passenger_id = $1`,
        [userId]
      );
      deletedEntities.tripHistory = tripResult.rowCount || 0;

      // Archive payment history (retain for tax compliance)
      const paymentResult = await query(
        `UPDATE payments
         SET user_anonymized = true,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
      deletedEntities.paymentHistory = paymentResult.rowCount || 0;

      // Delete uploaded documents
      const docResult = await query(
        `DELETE FROM user_documents
         WHERE user_id = $1`,
        [userId]
      );
      deletedEntities.documents = docResult.rowCount || 0;

      // Log the deletion
      await this.logAction(userId, 'data_deletion', `Data deleted: ${reason}`);

      return {
        success: true,
        deletedEntities,
        retainedData: {
          legalHoldRecords: 0,
          archivedRecords: deletedEntities.tripHistory + deletedEntities.paymentHistory,
          reason: 'Archived for legal compliance (BIR, LTFRB requirements)',
        },
      };
    } catch (error) {
      console.error('Error deleting user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete data',
      };
    }
  }

  /**
   * Rectify user data (Right to Rectification)
   */
  async rectifyUserData(
    userId: string,
    corrections: Record<string, any>
  ): Promise<DataRequestResponse> {
    try {
      // Build dynamic UPDATE query
      const fields = Object.keys(corrections);
      const values = Object.values(corrections);
      const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

      await query(
        `UPDATE users
         SET ${setClause}, updated_at = NOW()
         WHERE id = $1`,
        [userId, ...values]
      );

      // Log the rectification
      await this.logAction(
        userId,
        'data_rectification',
        `Data rectified: ${fields.join(', ')}`
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error rectifying user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rectify data',
      };
    }
  }

  /**
   * Restrict data processing (Right to Restriction)
   */
  async restrictProcessing(
    userId: string,
    restrictionType: string,
    reason: string
  ): Promise<DataRequestResponse> {
    try {
      await query(
        `UPDATE users
         SET processing_restricted = true,
             restriction_type = $2,
             restriction_reason = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [userId, restrictionType, reason]
      );

      // Log the restriction
      await this.logAction(
        userId,
        'processing_restriction',
        `Processing restricted: ${reason}`
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error restricting processing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restrict processing',
      };
    }
  }

  /**
   * Get request by ID
   */
  async getRequest(requestId: string): Promise<DPADataRequest | null> {
    try {
      const result = await query<DPADataRequest>(
        `SELECT * FROM dpa_data_requests WHERE request_id = $1`,
        [requestId]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapDataRequest(result.rows[0]);
    } catch (error) {
      console.error('Error fetching request:', error);
      return null;
    }
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId: string,
    status: string,
    notes?: string
  ): Promise<DataRequestResponse> {
    try {
      const result = await query<DPADataRequest>(
        `UPDATE dpa_data_requests
         SET status = $2,
             response_notes = COALESCE($3, response_notes),
             updated_at = NOW()
         WHERE request_id = $1
         RETURNING *`,
        [requestId, status, notes]
      );

      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'Request not found',
        };
      }

      return {
        success: true,
        request: this.mapDataRequest(result.rows[0]),
      };
    } catch (error) {
      console.error('Error updating request status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update request',
      };
    }
  }

  /**
   * Get statistics for data requests
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<DataRequestStatistics> {
    try {
      let sql = `
        SELECT
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review', 'processing')) as pending_requests,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
          AVG(EXTRACT(EPOCH FROM (completed_at - submitted_at))/86400) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_days,
          COUNT(*) FILTER (WHERE deadline_date < NOW() AND status NOT IN ('completed', 'rejected', 'cancelled')) as overdue_requests,
          request_type,
          COUNT(*) as count_by_type
        FROM dpa_data_requests
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      if (startDate) {
        conditions.push(`submitted_at >= $${params.length + 1}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`submitted_at <= $${params.length + 1}`);
        params.push(endDate);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ` GROUP BY request_type`;

      const result = await query<any>(sql, params);

      const stats: DataRequestStatistics = {
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        averageCompletionDays: 0,
        completionRate: 0,
        overdueRequests: 0,
        requestsByType: {} as any,
      };

      for (const row of result.rows) {
        stats.totalRequests += parseInt(row.total_requests);
        stats.pendingRequests += parseInt(row.pending_requests);
        stats.completedRequests += parseInt(row.completed_requests);
        stats.averageCompletionDays = parseFloat(row.avg_completion_days) || 0;
        stats.overdueRequests += parseInt(row.overdue_requests);
        stats.requestsByType[row.request_type] = parseInt(row.count_by_type);
      }

      stats.completionRate =
        stats.totalRequests > 0
          ? (stats.completedRequests / stats.totalRequests) * 100
          : 0;

      return stats;
    } catch (error) {
      console.error('Error fetching request statistics:', error);
      return {
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        averageCompletionDays: 0,
        completionRate: 0,
        overdueRequests: 0,
        requestsByType: {},
      };
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async getPersonalInfo(userId: string): Promise<any> {
    const result = await query(
      `SELECT id, name, email, phone, address, date_of_birth, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  private async getTripHistory(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT id, pickup_location, dropoff_location, distance_km,
              total_fare, status, created_at
       FROM rides WHERE passenger_id = $1
       ORDER BY created_at DESC
       LIMIT 1000`,
      [userId]
    );
    return result.rows;
  }

  private async getPaymentHistory(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT id, amount, payment_method, status, created_at
       FROM payments WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1000`,
      [userId]
    );
    return result.rows;
  }

  private async getPreferences(userId: string): Promise<any> {
    const result = await query(
      `SELECT preferences FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0]?.preferences || {};
  }

  private async getConsents(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT consent_type, consent_given, consent_version,
              consented_at, withdrawn, withdrawn_at
       FROM dpa_consents WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  private async getDocuments(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT document_type, file_name, uploaded_at
       FROM user_documents WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
      [userId]
    );
    return result.rows;
  }

  private async checkLegalHolds(
    userId: string
  ): Promise<{ hasHolds: boolean; recordCount: number; reason: string }> {
    // Check for active legal cases, disputes, or regulatory investigations
    const result = await query(
      `SELECT COUNT(*) as count
       FROM legal_holds
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const count = parseInt(result.rows[0]?.count || '0');

    return {
      hasHolds: count > 0,
      recordCount: count,
      reason: count > 0 ? 'Active legal hold or investigation' : '',
    };
  }

  private async logAction(
    userId: string,
    action: string,
    description: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO dpa_data_requests (
          request_id,
          user_id,
          user_type,
          request_type,
          status,
          actions_taken
        ) VALUES ($1, $2, 'passenger', 'access', 'completed', $3)`,
        [
          `LOG-${Date.now()}`,
          userId,
          JSON.stringify([
            {
              action,
              timestamp: new Date(),
              description,
            },
          ]),
        ]
      );
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }

  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DPA-${timestamp}-${random}`;
  }

  private mapDataRequest(row: any): DPADataRequest {
    return {
      id: row.id,
      requestId: row.request_id,
      userId: row.user_id,
      userType: row.user_type,
      userEmail: row.user_email,
      userPhone: row.user_phone,
      requestType: row.request_type,
      requestReason: row.request_reason,
      specificDataRequested:
        typeof row.specific_data_requested === 'string'
          ? JSON.parse(row.specific_data_requested)
          : row.specific_data_requested,
      status: row.status,
      assignedTo: row.assigned_to,
      priority: row.priority,
      identityVerified: row.identity_verified,
      verificationMethod: row.verification_method,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
      verifiedBy: row.verified_by,
      responseData:
        typeof row.response_data === 'string'
          ? JSON.parse(row.response_data)
          : row.response_data,
      responseFilePath: row.response_file_path,
      responseNotes: row.response_notes,
      deadlineDate: new Date(row.deadline_date),
      completedWithinDeadline: row.completed_within_deadline,
      rejectionReason: row.rejection_reason,
      rejectionLegalBasis: row.rejection_legal_basis,
      actionsTaken:
        typeof row.actions_taken === 'string'
          ? JSON.parse(row.actions_taken)
          : row.actions_taken,
      submittedAt: new Date(row.submitted_at),
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let dataSubjectRightsServiceInstance: DataSubjectRightsService | null = null;

export function getDataSubjectRightsService(): DataSubjectRightsService {
  if (!dataSubjectRightsServiceInstance) {
    dataSubjectRightsServiceInstance = new DataSubjectRightsService();
  }
  return dataSubjectRightsServiceInstance;
}
