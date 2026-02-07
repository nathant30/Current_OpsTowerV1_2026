/**
 * Redis Health Check API
 * GET /api/health/redis
 *
 * Check Redis connectivity and performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Try to import Redis client
    let redisClient: any = null;
    let redisAvailable = false;

    try {
      const Redis = require('ioredis');
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 5000,
        retryStrategy: () => null, // Don't retry for health check
      });
      redisAvailable = true;
    } catch (importError) {
      // Redis not configured or available
      redisAvailable = false;
    }

    if (!redisAvailable || !redisClient) {
      const responseTime = Date.now() - startTime;

      return NextResponse.json(
        {
          success: true,
          data: {
            status: 'not_configured',
            healthy: true, // Not required for app to work
            responseTime,
            message: 'Redis is not configured (optional service)',
            timestamp: new Date(),
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 200 }
      );
    }

    // Perform health check
    await redisClient.ping();

    // Get Redis info
    const info = await redisClient.info('server');
    const memory = await redisClient.info('memory');

    const responseTime = Date.now() - startTime;

    // Clean up connection
    await redisClient.quit();

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let statusCode = 200;

    if (responseTime > 1000) {
      status = 'degraded';
    }

    logger.info('Redis health check completed', {
      status,
      responseTime,
      requestId,
    }, {
      component: 'RedisHealthAPI',
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

    logger.error('Redis health check failed', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'RedisHealthAPI',
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
