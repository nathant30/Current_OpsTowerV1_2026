/**
 * Payment Analytics API
 * GET /api/payments/analytics
 *
 * Returns payment analytics and success rates by provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentOrchestrator } from '@/lib/payments/orchestrator';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Get date range from query params (default to last 30 days)
    const startParam = request.nextUrl.searchParams.get('startDate');
    const endParam = request.nextUrl.searchParams.get('endDate');

    const startDate = startParam ? new Date(startParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endParam ? new Date(endParam) : new Date();

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Invalid date range specified',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Start date must be before end date',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      );
    }

    // Get analytics
    const orchestrator = getPaymentOrchestrator();
    const analytics = await orchestrator.getPaymentAnalytics(startDate, endDate);

    const responseTime = Date.now() - startTime;

    logger.info('Payment analytics retrieved', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalTransactions: analytics.totalTransactions,
      responseTime,
      requestId,
    }, {
      component: 'PaymentAnalyticsAPI',
      action: 'getAnalytics',
    });

    return NextResponse.json(
      {
        success: true,
        data: analytics,
        timestamp: new Date(),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Failed to get payment analytics', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'PaymentAnalyticsAPI',
      action: 'getAnalytics',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYTICS_FETCH_FAILED',
          message: 'Failed to retrieve payment analytics',
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 500 }
    );
  }
}
