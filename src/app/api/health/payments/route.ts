/**
 * Payment Gateways Health Check API
 * GET /api/health/payments
 *
 * Check Maya and GCash payment gateway availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/security/productionLogger';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Check payment gateway availability from database
    const availabilityResult = await query(
      `SELECT provider, available, success_rate, average_response_time_ms,
              total_transactions, failed_transactions, last_success_at, last_failure_at
       FROM payment_method_availability
       WHERE provider IN ('maya', 'gcash')`
    );

    const gateways = availabilityResult.rows.map(row => ({
      provider: row.provider,
      available: row.available,
      successRate: parseFloat(row.success_rate || '0'),
      avgResponseTime: row.average_response_time_ms || 0,
      totalTransactions: row.total_transactions || 0,
      failedTransactions: row.failed_transactions || 0,
      lastSuccess: row.last_success_at ? new Date(row.last_success_at) : null,
      lastFailure: row.last_failure_at ? new Date(row.last_failure_at) : null,
    }));

    // Determine overall status
    const unavailableGateways = gateways.filter(g => !g.available);
    const degradedGateways = gateways.filter(g => g.available && g.successRate < 95);

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let statusCode = 200;

    if (unavailableGateways.length === gateways.length) {
      overallStatus = 'unhealthy';
      statusCode = 503;
    } else if (unavailableGateways.length > 0 || degradedGateways.length > 0) {
      overallStatus = 'degraded';
      statusCode = 200;
    }

    const responseTime = Date.now() - startTime;

    logger.info('Payment gateways health check completed', {
      overallStatus,
      gateways: gateways.map(g => ({ provider: g.provider, available: g.available })),
      responseTime,
      requestId,
    }, {
      component: 'PaymentHealthAPI',
      action: 'checkHealth',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          status: overallStatus,
          healthy: overallStatus === 'healthy',
          gateways,
          summary: {
            total: gateways.length,
            available: gateways.filter(g => g.available).length,
            unavailable: unavailableGateways.length,
            degraded: degradedGateways.length,
          },
          responseTime,
          timestamp: new Date(),
        },
        timestamp: new Date(),
        requestId,
      },
      { status: statusCode }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Payment gateways health check failed', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'PaymentHealthAPI',
      action: 'checkHealth',
    });

    return NextResponse.json(
      {
        success: false,
        data: {
          status: 'unhealthy',
          healthy: false,
          responseTime,
          error: (error as Error).message,
          timestamp: new Date(),
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 503 }
    );
  }
}
