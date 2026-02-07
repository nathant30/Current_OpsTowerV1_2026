/**
 * BSP AML Monitoring Integration for Payment System
 *
 * Integrates Anti-Money Laundering (AML) monitoring with the payment orchestrator
 * Automatically monitors completed payments for BSP threshold compliance
 *
 * @module lib/payments/aml-integration
 */

import { logger } from '@/lib/security/productionLogger';

// Import AML monitoring service (will work once database migrations are applied)
// Gracefully handles missing tables in development environment
let amlMonitoringService: any = null;

try {
  // Dynamic import to avoid errors if service is not available
  const amlModule = require('@/lib/compliance/bsp/aml-monitoring');
  if (amlModule && amlModule.getAMLMonitoringService) {
    amlMonitoringService = amlModule.getAMLMonitoringService();
  }
} catch (error) {
  logger.warn('AML monitoring service not available (database migrations may not be applied)', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
}

// ===================================================================
// TYPES
// ===================================================================

export interface PaymentCompletionData {
  transactionId: string;
  paymentId: string;
  amount: number;
  currency: string;
  userId: string;
  userType: 'passenger' | 'driver' | 'operator';
  userName: string;
  userEmail: string;
  userPhone?: string;
  transactionType: 'ride_payment' | 'wallet_topup' | 'refund' | 'withdrawal';
  transactionDate: Date;
  bookingId?: string;
  metadata?: Record<string, any>;
}

export interface AMLMonitoringResult {
  success: boolean;
  flaggedForReview: boolean;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  riskScore?: number;
  thresholdBreaches?: {
    singleTransaction: boolean;
    dailyCumulative: boolean;
    monthlyCumulative: boolean;
  };
  message?: string;
  error?: string;
}

// ===================================================================
// AML MONITORING INTEGRATION
// ===================================================================

/**
 * Monitor a completed payment for AML compliance
 *
 * This function should be called whenever a payment is marked as "completed"
 * It automatically checks BSP thresholds and flags suspicious transactions
 *
 * @param paymentData - Payment completion data
 * @returns AML monitoring result
 *
 * @example
 * ```typescript
 * // In webhook handler or status update:
 * if (payment.status === 'completed') {
 *   await monitorPaymentForAML({
 *     transactionId: payment.transaction_id,
 *     paymentId: payment.id,
 *     amount: payment.amount,
 *     currency: 'PHP',
 *     userId: payment.user_id,
 *     userType: 'passenger',
 *     userName: user.name,
 *     userEmail: user.email,
 *     transactionType: 'ride_payment',
 *     transactionDate: new Date()
 *   });
 * }
 * ```
 */
export async function monitorPaymentForAML(
  paymentData: PaymentCompletionData
): Promise<AMLMonitoringResult> {
  try {
    // If AML service is not available, log and return success
    // This allows the payment system to work even without AML monitoring in development
    if (!amlMonitoringService) {
      logger.info('AML monitoring skipped (service not available)', {
        transactionId: paymentData.transactionId,
        amount: paymentData.amount
      });

      return {
        success: true,
        flaggedForReview: false,
        message: 'AML monitoring not configured'
      };
    }

    // Monitor the transaction for AML compliance
    logger.info('Monitoring payment for AML compliance', {
      transactionId: paymentData.transactionId,
      amount: paymentData.amount,
      userId: paymentData.userId
    });

    const result = await amlMonitoringService.monitorTransaction({
      transactionId: paymentData.transactionId,
      paymentId: paymentData.paymentId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'PHP',
      transactionType: paymentData.transactionType,
      userId: paymentData.userId,
      userType: paymentData.userType,
      userName: paymentData.userName,
      userEmail: paymentData.userEmail,
      userPhone: paymentData.userPhone,
      transactionDate: paymentData.transactionDate,
      bookingId: paymentData.bookingId,
      metadata: paymentData.metadata
    });

    // Log successful monitoring
    if (result.flaggedForReview) {
      logger.warn('Transaction flagged for AML review', {
        transactionId: paymentData.transactionId,
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
        thresholdBreaches: result.thresholdBreaches
      });
    } else {
      logger.info('AML monitoring passed', {
        transactionId: paymentData.transactionId,
        riskLevel: result.riskLevel
      });
    }

    return {
      success: true,
      flaggedForReview: result.flaggedForReview,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      thresholdBreaches: result.thresholdBreaches,
      message: 'AML monitoring completed successfully'
    };

  } catch (error) {
    // Log error but don't fail the payment
    logger.error('AML monitoring failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      transactionId: paymentData.transactionId
    });

    return {
      success: false,
      flaggedForReview: false,
      error: error instanceof Error ? error.message : 'AML monitoring error',
      message: 'AML monitoring failed (payment not affected)'
    };
  }
}

/**
 * Batch monitor multiple payments for AML compliance
 *
 * Useful for processing historical transactions or daily batches
 *
 * @param payments - Array of payment completion data
 * @returns Array of monitoring results
 */
export async function batchMonitorPaymentsForAML(
  payments: PaymentCompletionData[]
): Promise<AMLMonitoringResult[]> {
  const results: AMLMonitoringResult[] = [];

  for (const payment of payments) {
    try {
      const result = await monitorPaymentForAML(payment);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        flaggedForReview: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

/**
 * Check if AML monitoring is available
 *
 * @returns True if AML service is configured and ready
 */
export function isAMLMonitoringAvailable(): boolean {
  return amlMonitoringService !== null;
}

// ===================================================================
// INTEGRATION HELPER FUNCTIONS
// ===================================================================

/**
 * Helper to extract payment data from orchestrator response
 *
 * Use this in webhook handlers or status update methods
 */
export function extractPaymentDataForAML(
  payment: any,
  user: any
): PaymentCompletionData {
  return {
    transactionId: payment.transaction_id || payment.transactionId,
    paymentId: payment.id || payment.paymentId,
    amount: typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount,
    currency: payment.currency || 'PHP',
    userId: payment.user_id || payment.userId,
    userType: payment.user_type || payment.userType || 'passenger',
    userName: user.name || user.full_name || 'Unknown',
    userEmail: user.email,
    userPhone: user.phone,
    transactionType: payment.booking_id ? 'ride_payment' : 'wallet_topup',
    transactionDate: payment.completed_at ? new Date(payment.completed_at) : new Date(),
    bookingId: payment.booking_id,
    metadata: payment.metadata
  };
}

// ===================================================================
// INTEGRATION INSTRUCTIONS
// ===================================================================

/**
 * HOW TO INTEGRATE AML MONITORING:
 *
 * 1. In Maya webhook handler (src/lib/payments/maya/service.ts):
 *    ```typescript
 *    import { monitorPaymentForAML, extractPaymentDataForAML } from '@/lib/payments/aml-integration';
 *
 *    // After updating payment status to 'completed':
 *    if (newStatus === 'completed') {
 *      const paymentData = extractPaymentDataForAML(payment, user);
 *      await monitorPaymentForAML(paymentData);
 *    }
 *    ```
 *
 * 2. In GCash webhook handler (src/lib/payments/gcash/service.ts):
 *    Same pattern as above
 *
 * 3. In any manual payment completion:
 *    ```typescript
 *    await monitorPaymentForAML({
 *      transactionId: payment.transaction_id,
 *      paymentId: payment.id,
 *      amount: payment.amount,
 *      currency: 'PHP',
 *      userId: payment.user_id,
 *      userType: 'passenger',
 *      userName: user.name,
 *      userEmail: user.email,
 *      transactionType: 'ride_payment',
 *      transactionDate: new Date()
 *    });
 *    ```
 *
 * BENEFITS:
 * - Non-blocking: Errors don't affect payment processing
 * - Graceful degradation: Works without database tables in dev
 * - Comprehensive logging: All monitoring events logged
 * - Automatic threshold checking: BSP ₱50K/₱100K/₱500K
 * - Risk scoring: Automatic risk assessment
 * - Suspicious pattern detection: Structuring, rapid succession
 */

export default {
  monitorPaymentForAML,
  batchMonitorPaymentsForAML,
  isAMLMonitoringAvailable,
  extractPaymentDataForAML
};
