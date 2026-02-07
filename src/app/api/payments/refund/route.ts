/**
 * Unified Payment Refund API
 * POST /api/payments/refund
 *
 * Process refund across any gateway
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentOrchestrator, UnifiedRefundRequest } from '@/lib/payments/orchestrator';
import { logger } from '@/lib/security/productionLogger';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    const validation = validateRefundRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid refund request',
            details: validation.errors,
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      );
    }

    // Build unified refund request
    const refundRequest: UnifiedRefundRequest = {
      transactionId: body.transactionId,
      amount: body.amount,
      reason: body.reason,
      requestedBy: body.requestedBy,
      metadata: body.metadata,
    };

    // Process refund through orchestrator
    const orchestrator = getPaymentOrchestrator();
    const refundResponse = await orchestrator.processRefund(refundRequest);

    const responseTime = Date.now() - startTime;

    // Log successful refund
    logger.info('Refund processed successfully', {
      refundId: refundResponse.refundId,
      transactionId: refundResponse.transactionId,
      provider: refundResponse.provider,
      amount: refundResponse.amount,
      responseTime,
      requestId,
    }, {
      component: 'UnifiedPaymentAPI',
      action: 'processRefund',
    });

    return NextResponse.json(
      {
        success: true,
        data: refundResponse,
        timestamp: new Date(),
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Refund processing failed', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'UnifiedPaymentAPI',
      action: 'processRefund',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REFUND_FAILED',
          message: error instanceof Error ? error.message : 'Failed to process refund',
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 500 }
    );
  }
}

// Validation helper
function validateRefundRequest(body: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!body.transactionId || typeof body.transactionId !== 'string') {
    errors.push('transactionId is required');
  }

  if (body.amount !== undefined && (typeof body.amount !== 'number' || body.amount <= 0)) {
    errors.push('amount must be a positive number if specified');
  }

  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    errors.push('reason is required');
  }

  if (!body.requestedBy || typeof body.requestedBy !== 'string') {
    errors.push('requestedBy is required');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
