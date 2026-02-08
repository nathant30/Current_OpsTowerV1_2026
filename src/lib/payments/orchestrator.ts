import { logger } from '@/lib/security/productionLogger';
/**
 * Payment Orchestration Service
 *
 * Unified payment orchestration layer that integrates Maya + GCash gateways
 * Provides intelligent routing, fallback logic, and unified interface
 *
 * @module lib/payments/orchestrator
 */

import { getMayaService, MayaPaymentService } from './maya/service';
import { getGCashService, GCashPaymentService } from './gcash/service';
import { query } from '../db';

// ===================================================================
// TYPES
// ===================================================================

export type PaymentProvider = 'maya' | 'gcash' | 'cash';

export interface UnifiedPaymentRequest {
  // Payment details
  amount: number;
  currency?: string;
  description: string;

  // Customer information
  userId: string;
  userType: 'passenger' | 'driver' | 'operator';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;

  // Related entity
  bookingId?: string;

  // Provider preference (optional - will auto-select if not specified)
  preferredProvider?: PaymentProvider;

  // Redirect URLs
  successUrl: string;
  failureUrl: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

export interface UnifiedPaymentResponse {
  // Transaction identifiers
  transactionId: string;
  referenceNumber: string;

  // Provider information
  provider: PaymentProvider;
  providerTransactionId: string;

  // Payment details
  amount: number;
  currency: string;
  fees: PaymentFees;
  netAmount: number;
  status: string;

  // Redirect information
  redirectUrl: string;
  qrCodeUrl?: string;
  deepLinkUrl?: string;

  // Expiry
  expiresAt: Date;

  // Timestamps
  createdAt: Date;
}

export interface PaymentFees {
  providerFee: number;
  platformFee: number;
  totalFee: number;
  feePercentage: number;
}

export interface UnifiedPaymentStatus {
  transactionId: string;
  provider: PaymentProvider;
  status: string;
  amount: number;
  currency: string;
  fees: PaymentFees;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failureReason?: string;
  providerDetails: {
    providerTransactionId: string;
    providerStatus: string;
  };
}

export interface UnifiedRefundRequest {
  transactionId: string;
  amount?: number;
  reason: string;
  requestedBy: string;
  metadata?: Record<string, unknown>;
}

export interface UnifiedRefundResponse {
  refundId: string;
  transactionId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
}

export interface PaymentMethodAvailability {
  provider: PaymentProvider;
  available: boolean;
  reason?: string;
  estimatedFee: number;
  feePercentage: number;
  processingTime: string;
  features: string[];
}

export interface PaymentAnalytics {
  period: string;
  totalTransactions: number;
  totalAmount: number;
  successRate: number;
  averageTransactionTime: number;
  byProvider: {
    [key in PaymentProvider]?: {
      transactions: number;
      amount: number;
      successRate: number;
      averageTime: number;
    };
  };
  failures: {
    total: number;
    byReason: Record<string, number>;
  };
}

// ===================================================================
// PAYMENT ORCHESTRATOR CLASS
// ===================================================================

export class PaymentOrchestrator {
  private mayaService: MayaPaymentService;
  private gcashService: GCashPaymentService;

  constructor(mayaService?: MayaPaymentService, gcashService?: GCashPaymentService) {
    this.mayaService = mayaService || getMayaService();
    this.gcashService = gcashService || getGCashService();
  }

  /**
   * Initiate a unified payment
   * Routes to appropriate gateway based on user preference or auto-selection
   */
  async initiatePayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    try {
      // Determine which provider to use
      const provider = await this.selectProvider(request);

      // Check if provider is available
      const availability = await this.checkProviderAvailability(provider);
      if (!availability.available) {
        throw new Error(`Payment provider ${provider} is not available: ${availability.reason}`);
      }

      // Calculate fees
      const fees = this.calculateFees(request.amount, provider);
      const netAmount = request.amount - fees.totalFee;

      // Route to appropriate gateway
      let response: UnifiedPaymentResponse;

      if (provider === 'maya') {
        const mayaResponse = await this.mayaService.initiatePayment({
          amount: request.amount,
          currency: request.currency || 'PHP',
          description: request.description,
          userId: request.userId,
          userType: request.userType,
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          customerPhone: request.customerPhone,
          bookingId: request.bookingId,
          successUrl: request.successUrl,
          failureUrl: request.failureUrl,
          metadata: request.metadata,
        });

        response = {
          transactionId: mayaResponse.transactionId,
          referenceNumber: mayaResponse.referenceNumber,
          provider: 'maya',
          providerTransactionId: mayaResponse.checkoutId,
          amount: mayaResponse.amount,
          currency: mayaResponse.currency,
          fees,
          netAmount,
          status: mayaResponse.status,
          redirectUrl: mayaResponse.redirectUrl,
          expiresAt: mayaResponse.expiresAt,
          createdAt: mayaResponse.createdAt,
        };
      } else if (provider === 'gcash') {
        const gcashResponse = await this.gcashService.initiatePayment({
          amount: request.amount,
          currency: request.currency || 'PHP',
          description: request.description,
          userId: request.userId,
          userType: request.userType,
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          customerPhone: request.customerPhone,
          bookingId: request.bookingId,
          successUrl: request.successUrl,
          failureUrl: request.failureUrl,
          metadata: request.metadata,
        });

        response = {
          transactionId: gcashResponse.transactionId,
          referenceNumber: gcashResponse.referenceNumber,
          provider: 'gcash',
          providerTransactionId: gcashResponse.ebanxHash,
          amount: gcashResponse.amount,
          currency: gcashResponse.currency,
          fees,
          netAmount,
          status: gcashResponse.status,
          redirectUrl: gcashResponse.redirectUrl,
          qrCodeUrl: gcashResponse.qrCodeUrl,
          deepLinkUrl: gcashResponse.deepLinkUrl,
          expiresAt: gcashResponse.expiresAt,
          createdAt: gcashResponse.createdAt,
        };
      } else {
        throw new Error(`Unsupported payment provider: ${provider}`);
      }

      // Log payment orchestration
      await this.logOrchestration({
        transactionId: response.transactionId,
        action: 'initiated',
        provider,
        amount: request.amount,
        fees,
        success: true,
      });

      return response;
    } catch (error) {
      logger.error('Payment initiation failed:', error);

      // Try fallback provider if configured
      if (request.preferredProvider && error instanceof Error) {
        const fallbackProvider = this.getFallbackProvider(request.preferredProvider);
        if (fallbackProvider) {
          logger.info(`Attempting fallback to ${fallbackProvider}...`);
          try {
            return await this.initiatePayment({
              ...request,
              preferredProvider: fallbackProvider,
            });
          } catch (fallbackError) {
            logger.error('Fallback payment also failed:', fallbackError);
          }
        }
      }

      throw error;
    }
  }

  /**
   * Get payment status across any provider
   */
  async getPaymentStatus(transactionId: string, syncWithProvider = false): Promise<UnifiedPaymentStatus> {
    try {
      // Get payment from database to determine provider
      const paymentResult = await query(
        `SELECT
          transaction_id, provider, provider_transaction_id, amount, currency,
          status, created_at, updated_at, completed_at, failure_reason, payment_method
        FROM payments
        WHERE transaction_id = $1`,
        [transactionId]
      );

      if (paymentResult.rows.length === 0) {
        throw new Error(`Payment not found: ${transactionId}`);
      }

      const payment = paymentResult.rows[0];
      const provider = payment.payment_method === 'paymaya' ? 'maya' : payment.payment_method as PaymentProvider;

      // Get status from appropriate service
      let providerStatus: any;
      if (provider === 'maya') {
        providerStatus = await this.mayaService.getPaymentStatus(transactionId, syncWithProvider);
      } else if (provider === 'gcash') {
        providerStatus = await this.gcashService.getPaymentStatus(transactionId, syncWithProvider);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Calculate fees
      const fees = this.calculateFees(parseFloat(payment.amount), provider);

      return {
        transactionId: payment.transaction_id,
        provider,
        status: payment.status,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        fees,
        createdAt: new Date(payment.created_at),
        updatedAt: new Date(payment.updated_at),
        completedAt: payment.completed_at ? new Date(payment.completed_at) : undefined,
        failureReason: payment.failure_reason,
        providerDetails: {
          providerTransactionId: payment.provider_transaction_id,
          providerStatus: providerStatus.status,
        },
      };
    } catch (error) {
      logger.error('Failed to get payment status:', error);
      throw error;
    }
  }

  /**
   * Process refund across any provider
   */
  async processRefund(request: UnifiedRefundRequest): Promise<UnifiedRefundResponse> {
    try {
      // Get payment to determine provider
      const paymentResult = await query(
        `SELECT provider, payment_method FROM payments WHERE transaction_id = $1`,
        [request.transactionId]
      );

      if (paymentResult.rows.length === 0) {
        throw new Error(`Payment not found: ${request.transactionId}`);
      }

      const payment = paymentResult.rows[0];
      const provider = payment.payment_method === 'paymaya' ? 'maya' : payment.payment_method as PaymentProvider;

      // Route refund to appropriate service
      let refundResponse: any;
      if (provider === 'maya') {
        refundResponse = await this.mayaService.processRefund(request);
      } else if (provider === 'gcash') {
        refundResponse = await this.gcashService.processRefund(request);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Log refund orchestration
      await this.logOrchestration({
        transactionId: request.transactionId,
        action: 'refunded',
        provider,
        amount: request.amount || 0,
        success: true,
      });

      return {
        refundId: refundResponse.refundId,
        transactionId: refundResponse.transactionId,
        provider,
        amount: refundResponse.amount,
        currency: refundResponse.currency,
        status: refundResponse.status,
        createdAt: refundResponse.createdAt,
      };
    } catch (error) {
      logger.error('Refund processing failed:', error);
      throw error;
    }
  }

  /**
   * Route webhook to appropriate handler
   */
  async routeWebhook(provider: PaymentProvider, payload: any): Promise<any> {
    try {
      if (provider === 'maya') {
        return await this.mayaService.handleWebhook(payload);
      } else if (provider === 'gcash') {
        return await this.gcashService.handleWebhook(payload);
      } else {
        throw new Error(`Unsupported webhook provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Webhook routing failed:', error);
      throw error;
    }
  }

  /**
   * Check availability of all payment methods
   */
  async getAvailablePaymentMethods(amount?: number): Promise<PaymentMethodAvailability[]> {
    const methods: PaymentMethodAvailability[] = [];

    // Maya availability
    methods.push(await this.checkProviderAvailability('maya', amount));

    // GCash availability
    methods.push(await this.checkProviderAvailability('gcash', amount));

    // Cash (always available for now)
    methods.push({
      provider: 'cash',
      available: true,
      estimatedFee: 0,
      feePercentage: 0,
      processingTime: 'immediate',
      features: ['No fees', 'Immediate settlement', 'In-person only'],
    });

    return methods;
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(startDate: Date, endDate: Date): Promise<PaymentAnalytics> {
    try {
      // Query payment statistics
      const statsResult = await query(
        `SELECT
          payment_method as provider,
          COUNT(*) as total_transactions,
          SUM(amount::numeric) as total_amount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_transactions,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_time_seconds,
          COUNT(CASE WHEN status IN ('failed', 'expired', 'cancelled') THEN 1 END) as failed_transactions
        FROM payments
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY payment_method`,
        [startDate, endDate]
      );

      // Query failure reasons
      const failureResult = await query(
        `SELECT
          failure_reason,
          COUNT(*) as count
        FROM payments
        WHERE created_at >= $1 AND created_at <= $2
          AND status IN ('failed', 'expired', 'cancelled')
          AND failure_reason IS NOT NULL
        GROUP BY failure_reason`,
        [startDate, endDate]
      );

      // Aggregate results
      const byProvider: PaymentAnalytics['byProvider'] = {};
      let totalTransactions = 0;
      let totalAmount = 0;
      let totalSuccessful = 0;
      let totalTime = 0;

      for (const row of statsResult.rows) {
        const provider = row.provider === 'paymaya' ? 'maya' : row.provider as PaymentProvider;
        const transactions = parseInt(row.total_transactions);
        const amount = parseFloat(row.total_amount || '0');
        const successful = parseInt(row.successful_transactions);
        const avgTime = parseFloat(row.avg_time_seconds || '0');

        byProvider[provider] = {
          transactions,
          amount,
          successRate: transactions > 0 ? (successful / transactions) * 100 : 0,
          averageTime: avgTime,
        };

        totalTransactions += transactions;
        totalAmount += amount;
        totalSuccessful += successful;
        totalTime += avgTime * transactions;
      }

      // Aggregate failure reasons
      const failuresByReason: Record<string, number> = {};
      let totalFailures = 0;
      for (const row of failureResult.rows) {
        const reason = row.failure_reason || 'unknown';
        const count = parseInt(row.count);
        failuresByReason[reason] = count;
        totalFailures += count;
      }

      return {
        period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
        totalTransactions,
        totalAmount,
        successRate: totalTransactions > 0 ? (totalSuccessful / totalTransactions) * 100 : 0,
        averageTransactionTime: totalTransactions > 0 ? totalTime / totalTransactions : 0,
        byProvider,
        failures: {
          total: totalFailures,
          byReason: failuresByReason,
        },
      };
    } catch (error) {
      logger.error('Failed to get payment analytics:', error);
      throw error;
    }
  }

  /**
   * Get or set default payment method for user
   */
  async getUserDefaultPaymentMethod(userId: string): Promise<PaymentProvider | null> {
    try {
      const result = await query(
        `SELECT default_payment_method FROM user_payment_preferences WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].default_payment_method as PaymentProvider;
    } catch (error) {
      logger.error('Failed to get default payment method:', error);
      return null;
    }
  }

  async setUserDefaultPaymentMethod(userId: string, provider: PaymentProvider): Promise<void> {
    try {
      await query(
        `INSERT INTO user_payment_preferences (user_id, default_payment_method, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET default_payment_method = $2, updated_at = NOW()`,
        [userId, provider]
      );
    } catch (error) {
      logger.error('Failed to set default payment method:', error);
      throw error;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Select appropriate payment provider
   */
  private async selectProvider(request: UnifiedPaymentRequest): Promise<PaymentProvider> {
    // Use preferred provider if specified
    if (request.preferredProvider) {
      return request.preferredProvider;
    }

    // Check user's default payment method
    const defaultMethod = await this.getUserDefaultPaymentMethod(request.userId);
    if (defaultMethod && defaultMethod !== 'cash') {
      return defaultMethod;
    }

    // Auto-select based on availability and performance
    const availability = await this.getAvailablePaymentMethods(request.amount);

    // Prefer Maya if available (lower fees, better UX)
    const mayaAvailable = availability.find(m => m.provider === 'maya' && m.available);
    if (mayaAvailable) {
      return 'maya';
    }

    // Fallback to GCash
    const gcashAvailable = availability.find(m => m.provider === 'gcash' && m.available);
    if (gcashAvailable) {
      return 'gcash';
    }

    throw new Error('No payment providers available');
  }

  /**
   * Get fallback provider
   */
  private getFallbackProvider(primary: PaymentProvider): PaymentProvider | null {
    if (primary === 'maya') {
      return 'gcash';
    }
    if (primary === 'gcash') {
      return 'maya';
    }
    return null;
  }

  /**
   * Check if provider is available
   */
  private async checkProviderAvailability(
    provider: PaymentProvider,
    amount?: number
  ): Promise<PaymentMethodAvailability> {
    try {
      if (provider === 'maya') {
        // Check Maya availability
        // Could check recent success rate, API status, etc.
        const fees = this.calculateFees(amount || 0, 'maya');

        return {
          provider: 'maya',
          available: true,
          estimatedFee: fees.totalFee,
          feePercentage: fees.feePercentage,
          processingTime: '15 minutes',
          features: [
            'Credit/Debit cards',
            'E-wallet',
            'Quick checkout',
            'Instant confirmation',
          ],
        };
      } else if (provider === 'gcash') {
        // Check GCash availability
        const fees = this.calculateFees(amount || 0, 'gcash');

        return {
          provider: 'gcash',
          available: true,
          estimatedFee: fees.totalFee,
          feePercentage: fees.feePercentage,
          processingTime: '30 minutes',
          features: [
            'GCash wallet',
            'QR code payment',
            'Mobile deep linking',
            'Real-time processing',
          ],
        };
      }

      return {
        provider,
        available: false,
        reason: 'Provider not supported',
        estimatedFee: 0,
        feePercentage: 0,
        processingTime: 'N/A',
        features: [],
      };
    } catch (error) {
      logger.error(`Provider availability check failed for ${provider}:`, error);
      return {
        provider,
        available: false,
        reason: 'Provider check failed',
        estimatedFee: 0,
        feePercentage: 0,
        processingTime: 'N/A',
        features: [],
      };
    }
  }

  /**
   * Calculate payment fees
   */
  private calculateFees(amount: number, provider: PaymentProvider): PaymentFees {
    let providerFee = 0;
    let platformFee = 0;
    let feePercentage = 0;

    if (provider === 'maya') {
      // Maya: 2.5% + PHP 15
      feePercentage = 2.5;
      providerFee = (amount * 0.025) + 15;
      platformFee = 0; // No additional platform fee
    } else if (provider === 'gcash') {
      // GCash via EBANX: 3.5% + PHP 10
      feePercentage = 3.5;
      providerFee = (amount * 0.035) + 10;
      platformFee = 0; // No additional platform fee
    }

    const totalFee = providerFee + platformFee;

    return {
      providerFee: Math.round(providerFee * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100,
      feePercentage,
    };
  }

  /**
   * Log orchestration event
   */
  private async logOrchestration(event: {
    transactionId: string;
    action: string;
    provider: PaymentProvider;
    amount?: number;
    fees?: PaymentFees;
    success: boolean;
    error?: string;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO payment_orchestration_logs (
          transaction_id, action, provider, amount, fees, success, error_message, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          event.transactionId,
          event.action,
          event.provider,
          event.amount || null,
          event.fees ? JSON.stringify(event.fees) : null,
          event.success,
          event.error || null,
        ]
      );
    } catch (error) {
      logger.error('Failed to log orchestration event:', error);
      // Don't throw - logging failure shouldn't break payment flow
    }
  }
}

// ===================================================================
// SINGLETON INSTANCE
// ===================================================================

let defaultOrchestrator: PaymentOrchestrator | null = null;

export function getPaymentOrchestrator(): PaymentOrchestrator {
  if (!defaultOrchestrator) {
    defaultOrchestrator = new PaymentOrchestrator();
  }
  return defaultOrchestrator;
}

export function createPaymentOrchestrator(
  mayaService?: MayaPaymentService,
  gcashService?: GCashPaymentService
): PaymentOrchestrator {
  return new PaymentOrchestrator(mayaService, gcashService);
}

export default PaymentOrchestrator;
