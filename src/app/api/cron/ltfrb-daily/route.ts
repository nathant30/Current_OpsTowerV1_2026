/**
 * LTFRB Daily Report Cron Endpoint
 * POST /api/cron/ltfrb-daily
 *
 * Vercel Cron job endpoint for daily LTFRB report generation
 * Configure in vercel.json with schedule: "0 2 * * *" (2 AM daily)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDailyLTFRBReport } from '@/lib/cron/ltfrb-daily-report';
import { logger } from '@/lib/security/productionLogger';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (Vercel provides this in headers)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron job access attempt', {
        endpoint: '/api/cron/ltfrb-daily',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('LTFRB daily report cron job triggered');

    const result = await generateDailyLTFRBReport();

    return NextResponse.json({
      success: true,
      message: 'Daily LTFRB report generated successfully',
      data: {
        reportId: result.reportId,
        totalTrips: result.report?.totalTrips,
        completedTrips: result.report?.completedTrips,
        duration: result.duration,
      },
    });
  } catch (error) {
    logger.error('LTFRB daily report cron job failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual triggering (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check for admin authentication
    // In production, verify admin user token
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('Manual LTFRB daily report generation triggered');

    const result = await generateDailyLTFRBReport();

    return NextResponse.json({
      success: true,
      message: 'Daily LTFRB report generated successfully (manual trigger)',
      data: {
        reportId: result.reportId,
        report: result.report,
        duration: result.duration,
      },
    });
  } catch (error) {
    logger.error('Manual LTFRB daily report generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
