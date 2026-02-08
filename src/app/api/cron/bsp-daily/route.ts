/**
 * BSP Daily Report Cron Job Endpoint
 *
 * Schedule this to run daily at 1 AM:
 * - Vercel Cron: Add to vercel.json
 * - GitHub Actions: Add to .github/workflows/daily-reports.yml
 * - Manual trigger: POST to this endpoint with Authorization header
 *
 * @module app/api/cron/bsp-daily
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBSPReport } from '@/lib/cron/bsp-daily-report';
import { logger } from '@/lib/security/productionLogger';

/**
 * Verify cron secret to prevent unauthorized access
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

  if (!authHeader) {
    return false;
  }

  // Support both "Bearer TOKEN" and direct token formats
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  return token === cronSecret;
}

/**
 * GET /api/cron/bsp-daily
 *
 * Generate daily BSP compliance report
 * Vercel Cron will call this endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      logger.warn('Unauthorized BSP cron job attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing CRON_SECRET',
        },
        { status: 401 }
      );
    }

    // Log cron job start
    logger.info('BSP daily cron job started', {
      triggeredBy: 'cron',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Generate report
    const result = await generateDailyBSPReport();

    const duration = Date.now() - startTime;

    logger.info('BSP daily cron job completed', {
      reportId: result.reportId,
      recordCount: result.recordCount,
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'BSP daily report generated successfully',
        data: {
          reportId: result.reportId,
          recordCount: result.recordCount,
          fileSize: result.fileSize,
          generatedAt: result.generatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('BSP daily cron job failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
        message: 'BSP daily report generation failed',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/bsp-daily
 *
 * Manual trigger for BSP daily report
 * Supports optional date parameter for historical reports
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      logger.warn('Unauthorized manual BSP report attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Parse request body (optional)
    let requestBody: { date?: string } = {};
    try {
      const text = await request.text();
      if (text) {
        requestBody = JSON.parse(text);
      }
    } catch {
      // Ignore parse errors - body is optional
    }

    logger.info('Manual BSP report generation triggered', {
      triggeredBy: 'manual',
      requestDate: requestBody.date || 'yesterday',
    });

    // Generate report
    const result = await generateDailyBSPReport();

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: 'BSP daily report generated successfully',
        data: {
          reportId: result.reportId,
          recordCount: result.recordCount,
          fileSize: result.fileSize,
          filePath: result.filePath,
          generatedAt: result.generatedAt,
        },
        duration: `${duration}ms`,
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Manual BSP report generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}
