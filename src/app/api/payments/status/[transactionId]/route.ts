/**
 * Unified Payment Status API
 * GET /api/payments/status/:transactionId
 *
 * Check payment status across any gateway
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentOrchestrator } from '@/lib/payments/orchestrator';
import { logger } from '@/lib/security/productionLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const { transactionId } = params;

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TRANSACTION_ID',
            message: 'Transaction ID is required',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      );
    }

    // Check if sync with provider is requested
    const syncWithProvider = request.nextUrl.searchParams.get('sync') === 'true';

    // Get payment status through orchestrator
    const orchestrator = getPaymentOrchestrator();
    const paymentStatus = await orchestrator.getPaymentStatus(transactionId, syncWithProvider);

    const responseTime = Date.now() - startTime;

    // Log status check
    logger.info('Payment status checked', {
      transactionId,
      status: paymentStatus.status,
      provider: paymentStatus.provider,
      syncWithProvider,
      responseTime,
      requestId,
    }, {
      component: 'UnifiedPaymentAPI',
      action: 'getPaymentStatus',
    });

    return NextResponse.json(
      {
        success: true,
        data: paymentStatus,
        timestamp: new Date(),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Payment status check failed', {
      transactionId: params.transactionId,
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'UnifiedPaymentAPI',
      action: 'getPaymentStatus',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to check payment status',
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 500 }
    );
  }
}
