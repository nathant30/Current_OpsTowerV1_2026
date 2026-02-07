/**
 * Driver Analytics API Routes
 *
 * GET /api/analytics/drivers?type=performance&driverId=...
 * GET /api/analytics/drivers?type=rankings&metric=earnings&limit=10
 * GET /api/analytics/drivers?type=earnings&driverId=...&period=month
 * GET /api/analytics/drivers?type=acceptance-rate&driverId=...
 * GET /api/analytics/drivers?type=cancellation-rate&driverId=...
 * GET /api/analytics/drivers?type=availability&driverId=...
 * GET /api/analytics/drivers?type=heatmap&driverId=...
 *
 * @module api/analytics/drivers
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'rankings';
    const driverId = searchParams.get('driverId');

    switch (type) {
      case 'performance': {
        if (!driverId) {
          return NextResponse.json(
            { success: false, error: 'driverId is required for performance analytics' },
            { status: 400 }
          );
        }

        const data = await analyticsService.getDriverPerformance(driverId);

        if (!data) {
          return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'rankings': {
        const limit = parseInt(searchParams.get('limit') || '10');
        const metric = (searchParams.get('metric') || 'earnings') as 'earnings' | 'trips' | 'rating';

        const data = await analyticsService.getTopDrivers(limit, metric);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            metric,
            limit,
          },
        });
      }

      case 'earnings': {
        if (!driverId) {
          return NextResponse.json(
            { success: false, error: 'driverId is required for earnings analytics' },
            { status: 400 }
          );
        }

        const period = (searchParams.get('period') || 'month') as 'week' | 'month';
        const data = await analyticsService.getDriverEarnings(driverId, period);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            period,
          },
        });
      }

      case 'acceptance-rate': {
        if (!driverId) {
          return NextResponse.json(
            { success: false, error: 'driverId is required for acceptance rate' },
            { status: 400 }
          );
        }

        const rate = await analyticsService.getDriverAcceptanceRate(driverId);

        return NextResponse.json({
          success: true,
          data: { driverId, acceptanceRate: rate },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'cancellation-rate': {
        if (!driverId) {
          return NextResponse.json(
            { success: false, error: 'driverId is required for cancellation rate' },
            { status: 400 }
          );
        }

        const rate = await analyticsService.getDriverCancellationRate(driverId);

        return NextResponse.json({
          success: true,
          data: { driverId, cancellationRate: rate },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'availability': {
        if (!driverId) {
          return NextResponse.json(
            { success: false, error: 'driverId is required for availability analytics' },
            { status: 400 }
          );
        }

        const data = await analyticsService.getDriverAvailability(driverId);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'heatmap': {
        if (!driverId) {
          return NextResponse.json(
            { success: false, error: 'driverId is required for activity heatmap' },
            { status: 400 }
          );
        }

        const data = await analyticsService.getDriverActivityHeatmap(driverId);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown driver analytics type: ${type}. Valid types: performance, rankings, earnings, acceptance-rate, cancellation-rate, availability, heatmap`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Driver analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
