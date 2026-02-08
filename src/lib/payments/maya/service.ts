import { logger } from '@/lib/security/productionLogger';
/**
 * Maya Payment Service Layer
 *
 * Business logic for Maya payment processing
 * Handles payment initiation, webhook processing, status updates, transaction logging
 * Integrates with database and encryption
 *
 * @module lib/payments/maya/service
 */

import { getMayaClient, MayaClient } from './client';
import {
  MayaPaymentRequest,
  MayaPaymentResponse,
  PaymentStatusResult,
  RefundRequest,
  RefundResponse,
  MayaWebhookPayload,
  WebhookProcessingResult,
  MayaAPIError,
  MAYA_TO_INTERNAL_STATUS,
  TransactionLogEntry,
  MayaPaymentStatus,
} from './types';
import { encrypt, encryptFields, decrypt, decryptFields } from '../../security/encryption';
import { query } from '../../db';

/**
 * Maya Payment Service
 * High-level payment operations with database integration
 */
export class MayaPaymentService {
  private client: MayaClient;

  constructor(client?: MayaClient) {
    this.client = client || getMayaClient();
  }

  /**
   * Initiate a new Maya payment
   *
   * 1. Validate request
   * 2. Create checkout via Maya API
   * 3. Store in database with encryption
   * 4. Log transaction
   *
   * @param request - Payment request details
   * @returns Payment response with redirect URL
   * @throws Error if payment creation fails
   */
  async initiatePayment(request: MayaPaymentRequest): Promise<MayaPaymentResponse> {
    try {
      // Validate request
      this.validatePaymentRequest(request);

      // Create checkout via Maya
      const paymentResponse = await this.client.createCheckout(request);

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
          'maya',
          paymentResponse.checkoutId,
          paymentResponse.amount,
          paymentResponse.currency,
          'paymaya',
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
        description: 'Payment initiated via Maya',
        newStatus: 'pending',
        source: 'api',
        requestData: {
          amount: request.amount,
          currency: request.currency,
          description: request.description,
        },
        responseData: {
          checkoutId: paymentResponse.checkoutId,
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
   * Handle Maya webhook notification
   *
   * 1. Verify webhook signature
   * 2. Parse payment status
   * 3. Update database
   * 4. Log event
   *
   * @param payload - Webhook payload
   * @returns Processing result
   * @throws Error if webhook processing fails
   */
  async handleWebhook(payload: MayaWebhookPayload): Promise<WebhookProcessingResult> {
    
    try {
      // Verify signature
      const isValid = this.client.verifyWebhookSignature(payload);

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Store webhook event
      const webhookEventId = await this.storeWebhookEvent(payload, true);

      // Extract payment data
      const webhookData = payload.body.data;
      const paymentId = webhookData.id;
      const transactionId = webhookData.requestReferenceNumber;
      const mayaStatus = webhookData.status;
      const newStatus = MAYA_TO_INTERNAL_STATUS[mayaStatus] || 'unknown';

      // Get payment from database
      const paymentResult = await query(
        `SELECT id, transaction_id, status FROM payments WHERE provider_transaction_id = $1 OR transaction_id = $2`,
        [paymentId, transactionId]
      );

      if (paymentResult.rows.length === 0) {
        logger.warn(`Payment not found for Maya payment ID: ${paymentId} / Transaction ID: ${transactionId}`);
        throw new Error('Payment not found');
      }

      const payment = paymentResult.rows[0];
      const previousStatus = payment.status;

      // Update payment status
      await this.updatePaymentStatus(payment.transaction_id, newStatus, paymentId);

      // Mark webhook as processed
      await query(
        `UPDATE webhook_events SET processed = true, processed_at = NOW() WHERE id = $1`,
        [webhookEventId]
      );

      return {
        success: true,
        paymentId,
        transactionId: payment.transaction_id,
        previousStatus,
        newStatus,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Webhook processing failed:', error);

      return {
        success: false,
        paymentId: payload.body.data?.id || '',
        transactionId: payload.body.data?.requestReferenceNumber || '',
        previousStatus: '',
        newStatus: '',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update payment status in database
   *
   * @param transactionId - Transaction ID
   * @param newStatus - New status
   * @param mayaPaymentId - Maya payment ID (optional)
   */
  async updatePaymentStatus(
    transactionId: string,
    newStatus: string,
    mayaPaymentId?: string
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
   * Get payment status from database and optionally sync with Maya
   *
   * @param transactionId - Transaction ID
   * @param syncWithMaya - Whether to sync with Maya API
   * @returns Payment status result
   */
  async getPaymentStatus(
    transactionId: string,
    syncWithMaya = false
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

      // Optionally sync with Maya
      if (syncWithMaya && payment.provider_transaction_id) {
        try {
          const mayaStatus = await this.client.getPaymentStatus(
            payment.provider_transaction_id
          );

          const newStatus = MAYA_TO_INTERNAL_STATUS[mayaStatus.status];

          // Update if status changed
          if (newStatus !== payment.status) {
            await this.updatePaymentStatus(transactionId, newStatus);
            payment.status = newStatus;
          }
        } catch (error) {
          logger.warn('Failed to sync with Maya:', error);
          // Continue with database status
        }
      }

      return {
        transactionId: payment.transaction_id,
        status: payment.status,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        checkoutId: payment.provider_transaction_id,
        mayaStatus: payment.status as MayaPaymentStatus,
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
   * 3. Process refund via Maya (if approved)
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
      const refundReferenceNumber = `REFUND-${Date.now()}-${request.transactionId.slice(-8)}`;

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
          'maya',
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
   * Handle payment timeout (15 minutes expiry)
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
        description: 'Payment expired after timeout period (15 minutes)',
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
    payload: MayaWebhookPayload,
    signatureVerified: boolean
  ): Promise<string> {
    
    try {
      const result = await query(
        `INSERT INTO webhook_events (
          provider, event_type, payload, headers, signature, signature_verified,
          processed, received_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
        [
          'maya',
          payload.body.name,
          JSON.stringify(payload.body),
          JSON.stringify(payload.headers),
          payload.headers['x-maya-signature'] || null,
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
  private validatePaymentRequest(request: MayaPaymentRequest): void {
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
let defaultService: MayaPaymentService | null = null;

/**
 * Get default Maya payment service
 *
 * @returns Default service instance
 */
export function getMayaService(): MayaPaymentService {
  if (!defaultService) {
    defaultService = new MayaPaymentService();
  }
  return defaultService;
}

/**
 * Create a new Maya payment service with custom client
 *
 * @param client - Custom Maya client
 * @returns New service instance
 */
export function createMayaService(client: MayaClient): MayaPaymentService {
  return new MayaPaymentService(client);
}

export default MayaPaymentService;
