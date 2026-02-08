/**
 * LTFRB Document Expiry Check Cron Endpoint
 * POST /api/cron/ltfrb-expiry
 *
 * Vercel Cron job endpoint for checking expiring driver/vehicle documents
 * Configure in vercel.json with schedule: "0 8 * * *" (8 AM daily)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAllDocumentExpiry } from '@/lib/cron/ltfrb-expiry-check';
import { logger } from '@/lib/security/productionLogger';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (Vercel provides this in headers)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron job access attempt', {
        endpoint: '/api/cron/ltfrb-expiry',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('LTFRB document expiry check cron job triggered');

    const result = await checkAllDocumentExpiry(30); // Check 30 days in advance

    return NextResponse.json({
      success: true,
      message: 'Document expiry check completed successfully',
      data: {
        expiringDrivers: result.expiringDrivers,
        expiredDrivers: result.expiredDrivers,
        expiringVehicles: result.expiringVehicles,
        expiredVehicles: result.expiredVehicles,
        notifications: result.notifications,
        duration: result.duration,
      },
    });
  } catch (error) {
    logger.error('LTFRB document expiry check cron job failed', {
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

    // Get days parameter from query string
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    logger.info('Manual LTFRB document expiry check triggered', { days });

    const result = await checkAllDocumentExpiry(days);

    return NextResponse.json({
      success: true,
      message: 'Document expiry check completed successfully (manual trigger)',
      data: {
        expiringDrivers: result.expiringDrivers,
        expiredDrivers: result.expiredDrivers,
        expiringVehicles: result.expiringVehicles,
        expiredVehicles: result.expiredVehicles,
        notifications: result.notifications,
        duration: result.duration,
      },
    });
  } catch (error) {
    logger.error('Manual LTFRB document expiry check failed', {
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
