import { logger } from '@/lib/security/productionLogger';
/**
 * GCash Payment Service Layer
 *
 * Business logic for GCash payment processing
 * Handles payment initiation, webhook processing, status updates, transaction logging
 * Integrates with database and encryption
 *
 * @module lib/payments/gcash/service
 */

import { getEBANXClient, EBANXClient } from './client';
import {
  GCashPaymentRequest,
  GCashPaymentResponse,
  PaymentStatusResult,
  RefundRequest,
  RefundResponse,
  EBANXWebhookPayload,
  WebhookProcessingResult,
  EBANXAPIError,
  EBANX_TO_INTERNAL_STATUS,
  TransactionLogEntry,
} from './types';
import { encrypt, encryptFields, decrypt, decryptFields } from '../../security/encryption';
import { query } from '../../db';

/**
 * GCash Payment Service
 * High-level payment operations with database integration
 */
export class GCashPaymentService {
  private client: EBANXClient;

  constructor(client?: EBANXClient) {
    this.client = client || getEBANXClient();
  }

  /**
   * Initiate a new GCash payment
   *
   * 1. Validate request
   * 2. Create payment via EBANX API
   * 3. Store in database with encryption
   * 4. Log transaction
   *
   * @param request - Payment request details
   * @returns Payment response with redirect URL
   * @throws Error if payment creation fails
   */
  async initiatePayment(request: GCashPaymentRequest): Promise<GCashPaymentResponse> {
    
    try {
      // Validate request
      this.validatePaymentRequest(request);

      // Create payment via EBANX
      const paymentResponse = await this.client.createPayment(request);

      // Store in database
      await query(
        `INSERT INTO payments (
          transaction_id, reference_number, provider, provider_transaction_id,
          amount, currency, payment_method, user_id, user_type, booking_id,
          status, description, success_url, failure_url, redirect_url,
          expires_at, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          paymentResponse.transactionId,
          paymentResponse.referenceNumber,
          'ebanx',
          paymentResponse.ebanxHash,
          paymentResponse.amount,
          paymentResponse.currency,
          'gcash',
          request.userId,
          request.userType,
          request.bookingId || null,
          paymentResponse.status,
          request.description,
          request.successUrl,
          request.failureUrl,
          paymentResponse.redirectUrl,
          paymentResponse.expiresAt,
          JSON.stringify(request.metadata || {}),
          paymentResponse.createdAt,
        ]
      );

      // Log transaction
      await this.logTransaction({
        paymentId: paymentResponse.transactionId,
        transactionId: paymentResponse.transactionId,
        eventType: 'initiated',
        description: 'Payment initiated via EBANX',
        newStatus: 'pending',
        source: 'api',
        requestData: {
          amount: request.amount,
          currency: request.currency,
          description: request.description,
        },
        responseData: {
          ebanxHash: paymentResponse.ebanxHash,
          redirectUrl: paymentResponse.redirectUrl,
        },
      });

      return paymentResponse;
    } catch (error) {
      // Log error
      logger.error('Payment initiation failed:', error);

      throw error;
    }
  }

  /**
   * Handle EBANX webhook notification
   *
   * 1. Verify webhook signature
   * 2. Query payment status from EBANX
   * 3. Update database
   * 4. Log event
   *
   * @param payload - Webhook payload
   * @returns Processing result
   * @throws Error if webhook processing fails
   */
  async handleWebhook(payload: EBANXWebhookPayload): Promise<WebhookProcessingResult[]> {
        const results: WebhookProcessingResult[] = [];

    try {
      // Verify signature
      const isValid = this.client.verifyWebhookSignature(payload);

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Store webhook event
      const webhookEventId = await this.storeWebhookEvent(payload, true);

      // Process each payment hash in the webhook
      for (const paymentHash of payload.body.hash_codes) {
        try {
          // Query current payment status from EBANX
          const statusResponse = await this.client.getPaymentStatus(paymentHash);

          // Get payment from database
          const paymentResult = await query(
            `SELECT id, transaction_id, status FROM payments WHERE provider_transaction_id = $1`,
            [paymentHash]
          );

          if (paymentResult.rows.length === 0) {
            logger.warn(`Payment not found for hash: ${paymentHash}`);
            continue;
          }

          const payment = paymentResult.rows[0];
          const previousStatus = payment.status;
          const newStatus = EBANX_TO_INTERNAL_STATUS[statusResponse.payment.status];

          // Update payment status
          await this.updatePaymentStatus(payment.transaction_id, newStatus, paymentHash);

          // Mark webhook as processed
          await query(
            `UPDATE webhook_events SET processed = true, processed_at = NOW() WHERE id = $1`,
            [webhookEventId]
          );

          results.push({
            success: true,
            paymentHash,
            transactionId: payment.transaction_id,
            previousStatus,
            newStatus,
            timestamp: new Date(),
          });
        } catch (error) {
          logger.error(`Failed to process webhook for hash ${paymentHash}:`, error);

          results.push({
            success: false,
            paymentHash,
            transactionId: '',
            previousStatus: '',
            newStatus: '',
            timestamp: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Update payment status in database
   *
   * @param transactionId - Transaction ID
   * @param newStatus - New status
   * @param ebanxHash - EBANX payment hash (optional)
   */
  async updatePaymentStatus(
    transactionId: string,
    newStatus: string,
    ebanxHash?: string
  ): Promise<void> {
    
    try {
      // Get current payment
      const paymentResult = await query(
        `SELECT status FROM payments WHERE transaction_id = $1`,
        [transactionId]
      );

      if (paymentResult.rows.length === 0) {
        throw new Error(`Payment not found: ${transactionId}`);
      }

      const previousStatus = paymentResult.rows[0].status;

      // Update payment status
      const updateQuery = `
        UPDATE payments
        SET status = $1, updated_at = NOW(), completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
        WHERE transaction_id = $2
      `;

      await query(updateQuery, [newStatus, transactionId]);

      // Log status change
      await this.logTransaction({
        paymentId: transactionId,
        transactionId,
        eventType: newStatus,
        previousStatus,
        newStatus,
        description: `Payment status changed from ${previousStatus} to ${newStatus}`,
        source: 'webhook',
      });
    } catch (error) {
      logger.error('Failed to update payment status:', error);
      throw error;
    }
  }

  /**
   * Get payment status from database and optionally sync with EBANX
   *
   * @param transactionId - Transaction ID
   * @param syncWithEBANX - Whether to sync with EBANX API
   * @returns Payment status result
   */
  async getPaymentStatus(
    transactionId: string,
    syncWithEBANX = false
  ): Promise<PaymentStatusResult> {
    
    try {
      // Get from database
      const result = await query(
        `SELECT
          transaction_id, status, amount, currency, provider_transaction_id,
          created_at, updated_at, completed_at, failure_reason
        FROM payments
        WHERE transaction_id = $1`,
        [transactionId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Payment not found: ${transactionId}`);
      }

      const payment = result.rows[0];

      // Optionally sync with EBANX
      if (syncWithEBANX && payment.provider_transaction_id) {
        try {
          const ebanxStatus = await this.client.getPaymentStatus(
            payment.provider_transaction_id
          );

          const newStatus = EBANX_TO_INTERNAL_STATUS[ebanxStatus.payment.status];

          // Update if status changed
          if (newStatus !== payment.status) {
            await this.updatePaymentStatus(transactionId, newStatus);
            payment.status = newStatus;
          }
        } catch (error) {
          logger.warn('Failed to sync with EBANX:', error);
          // Continue with database status
        }
      }

      return {
        transactionId: payment.transaction_id,
        status: payment.status,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        ebanxHash: payment.provider_transaction_id,
        ebanxStatus: payment.status,
        createdAt: new Date(payment.created_at),
        updatedAt: new Date(payment.updated_at),
        completedAt: payment.completed_at ? new Date(payment.completed_at) : undefined,
        failureReason: payment.failure_reason,
      };
    } catch (error) {
      logger.error('Failed to get payment status:', error);
      throw error;
    }
  }

  /**
   * Process a refund request
   *
   * 1. Validate refund request
   * 2. Create refund record in database
   * 3. Process refund via EBANX (if approved)
   * 4. Log transaction
   *
   * @param request - Refund request
   * @returns Refund response
   */
  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    
    try {
      // Get payment
      const paymentResult = await query(
        `SELECT id, provider_transaction_id, amount, currency, status FROM payments WHERE transaction_id = $1`,
        [request.transactionId]
      );

      if (paymentResult.rows.length === 0) {
        throw new Error(`Payment not found: ${request.transactionId}`);
      }

      const payment = paymentResult.rows[0];

      // Validate payment is completed
      if (payment.status !== 'completed') {
        throw new Error(`Cannot refund payment with status: ${payment.status}`);
      }

      // Validate refund amount
      const refundAmount = request.amount || parseFloat(payment.amount);
      if (refundAmount > parseFloat(payment.amount)) {
        throw new Error('Refund amount exceeds payment amount');
      }

      const refundType = refundAmount === parseFloat(payment.amount) ? 'full' : 'partial';

      // Generate refund ID
      const refundId = `REF-${Date.now()}-${request.transactionId.slice(-8)}`;

      // Create refund record
      await query(
        `INSERT INTO refunds (
          refund_id, payment_id, transaction_id, provider, amount, currency,
          refund_type, status, reason, requested_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          refundId,
          payment.id,
          request.transactionId,
          'ebanx',
          refundAmount,
          payment.currency,
          refundType,
          'pending', // Starts as pending, needs approval
          request.reason,
          request.requestedBy,
        ]
      );

      // Log transaction
      await this.logTransaction({
        paymentId: request.transactionId,
        transactionId: request.transactionId,
        eventType: 'refunded',
        description: `Refund requested: ${refundType} refund of ${refundAmount} ${payment.currency}`,
        source: 'api',
        requestData: {
          refundId,
          amount: refundAmount,
          reason: request.reason,
        },
      });

      return {
        refundId,
        transactionId: request.transactionId,
        amount: refundAmount,
        currency: payment.currency,
        status: 'pending',
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Refund processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle payment timeout (30 minutes expiry)
   *
   * Marks expired payments as 'expired' status
   */
  async handleTimeout(transactionId: string): Promise<void> {
    
    try {
      // Update payment status to expired
      await query(
        `UPDATE payments SET status = 'expired', updated_at = NOW() WHERE transaction_id = $1 AND status = 'pending'`,
        [transactionId]
      );

      // Log timeout
      await this.logTransaction({
        paymentId: transactionId,
        transactionId,
        eventType: 'expired',
        previousStatus: 'pending',
        newStatus: 'expired',
        description: 'Payment expired after timeout period',
        source: 'system',
      });
    } catch (error) {
      logger.error('Failed to handle timeout:', error);
      throw error;
    }
  }

  /**
   * Log transaction event
   *
   * @param entry - Transaction log entry
   */
  async logTransaction(entry: TransactionLogEntry): Promise<void> {
    
    try {
      await query(
        `INSERT INTO transaction_logs (
          transaction_id, event_type, previous_status, new_status,
          description, request_data, response_data, error_message, error_code,
          source, source_ip, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          entry.transactionId,
          entry.eventType,
          entry.previousStatus || null,
          entry.newStatus || null,
          entry.description,
          entry.requestData ? JSON.stringify(entry.requestData) : null,
          entry.responseData ? JSON.stringify(entry.responseData) : null,
          entry.errorMessage || null,
          entry.errorCode || null,
          entry.source,
          entry.sourceIp || null,
          entry.createdBy || null,
        ]
      );
    } catch (error) {
      logger.error('Failed to log transaction:', error);
      // Don't throw - logging failure shouldn't break payment flow
    }
  }

  /**
   * Store webhook event in database
   *
   * @param payload - Webhook payload
   * @param signatureVerified - Whether signature was verified
   * @returns Webhook event ID
   */
  private async storeWebhookEvent(
    payload: EBANXWebhookPayload,
    signatureVerified: boolean
  ): Promise<string> {
    
    try {
      const result = await query(
        `INSERT INTO webhook_events (
          provider, event_type, payload, headers, signature, signature_verified,
          processed, received_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
        [
          'ebanx',
          payload.body.notification_type,
          JSON.stringify(payload.body),
          JSON.stringify(payload.headers),
          payload.headers['x-ebanx-signature'] || null,
          signatureVerified,
          false,
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to store webhook event:', error);
      throw error;
    }
  }

  /**
   * Validate payment request
   *
   * @param request - Payment request
   * @throws Error if validation fails
   */
  private validatePaymentRequest(request: GCashPaymentRequest): void {
    if (request.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (request.amount > 100000) {
      throw new Error('Payment amount exceeds maximum limit (PHP 100,000)');
    }

    if (!request.description || request.description.trim().length === 0) {
      throw new Error('Payment description is required');
    }

    if (!request.userId || request.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!request.customerName || request.customerName.trim().length === 0) {
      throw new Error('Customer name is required');
    }

    if (!request.customerEmail || !this.isValidEmail(request.customerEmail)) {
      throw new Error('Valid customer email is required');
    }

    if (!request.successUrl || !this.isValidUrl(request.successUrl)) {
      throw new Error('Valid success URL is required');
    }

    if (!request.failureUrl || !this.isValidUrl(request.failureUrl)) {
      throw new Error('Valid failure URL is required');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Default payment service instance
 */
let defaultService: GCashPaymentService | null = null;

/**
 * Get default GCash payment service
 *
 * @returns Default service instance
 */
export function getGCashService(): GCashPaymentService {
  if (!defaultService) {
    defaultService = new GCashPaymentService();
  }
  return defaultService;
}

/**
 * Create a new GCash payment service with custom client
 *
 * @param client - Custom EBANX client
 * @returns New service instance
 */
export function createGCashService(client: EBANXClient): GCashPaymentService {
  return new GCashPaymentService(client);
}

export default GCashPaymentService;
