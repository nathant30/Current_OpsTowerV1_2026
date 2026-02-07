/**
 * Database Health Check API
 * GET /api/health/database
 *
 * Check PostgreSQL database connectivity and performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseAdapter } from '@/lib/database';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const db = getDatabaseAdapter();

    // Perform database health check
    const healthCheck = await db.healthCheck();
    const responseTime = Date.now() - startTime;

    // Get connection pool metrics
    const connectionMetrics = {
      total: healthCheck.connections?.total || 0,
      idle: healthCheck.connections?.idle || 0,
      waiting: healthCheck.connections?.waiting || 0,
    };

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let statusCode = 200;

    if (healthCheck.status === 'unhealthy') {
      status = 'unhealthy';
      statusCode = 503;
    } else if (responseTime > 5000 || connectionMetrics.waiting > 10) {
      status = 'degraded';
      statusCode = 200;
    }

    logger.info('Database health check completed', {
      status,
      responseTime,
      connectionMetrics,
      requestId,
    }, {
      component: 'DatabaseHealthAPI',
      action: 'checkHealth',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          status,
          healthy: status === 'healthy',
          responseTime,
          metrics: {
            ...connectionMetrics,
            responseTime,
          },
          timestamp: new Date(),
        },
        timestamp: new Date(),
        requestId,
      },
      { status: statusCode }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Database health check failed', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'DatabaseHealthAPI',
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
