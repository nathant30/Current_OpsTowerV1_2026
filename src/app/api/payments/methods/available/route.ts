/**
 * Payment Methods Availability API
 * GET /api/payments/methods/available
 *
 * Returns available payment methods with fees and features
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentOrchestrator } from '@/lib/payments/orchestrator';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Get optional amount parameter for fee calculation
    const amount = parseFloat(request.nextUrl.searchParams.get('amount') || '0');

    // Get available payment methods
    const orchestrator = getPaymentOrchestrator();
    const methods = await orchestrator.getAvailablePaymentMethods(amount || undefined);

    const responseTime = Date.now() - startTime;

    logger.info('Payment methods retrieved', {
      methodCount: methods.length,
      amount,
      responseTime,
      requestId,
    }, {
      component: 'PaymentMethodsAPI',
      action: 'getAvailableMethods',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          methods,
          timestamp: new Date(),
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Failed to get payment methods', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'PaymentMethodsAPI',
      action: 'getAvailableMethods',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'METHODS_FETCH_FAILED',
          message: 'Failed to retrieve available payment methods',
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 500 }
    );
  }
}
