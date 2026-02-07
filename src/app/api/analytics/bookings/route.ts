/**
 * Booking Analytics API Routes
 *
 * GET /api/analytics/bookings?type=trends&period=daily
 * GET /api/analytics/bookings?type=peak-hours
 * GET /api/analytics/bookings?type=by-service-type
 * GET /api/analytics/bookings?type=wait-time
 * GET /api/analytics/bookings?type=cancellation-rate
 * GET /api/analytics/bookings?type=completion-rate
 *
 * @module api/analytics/bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'trends';

    switch (type) {
      case 'trends': {
        const period = (searchParams.get('period') || 'day') as 'hour' | 'day' | 'week' | 'month';
        const data = await analyticsService.getBookingTrends(period);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            period,
          },
        });
      }

      case 'peak-hours': {
        const data = await analyticsService.getPeakHours();

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'by-service-type': {
        const startDate = searchParams.get('start') ? new Date(searchParams.get('start')!) : undefined;
        const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : undefined;

        const data = await analyticsService.getBookingsByServiceType(startDate, endDate);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'wait-time': {
        const data = await analyticsService.getAverageWaitTime();

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'cancellation-rate': {
        const data = await analyticsService.getCancellationRate();

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'completion-rate': {
        const data = await analyticsService.getCompletionRate();

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
            error: `Unknown booking analytics type: ${type}. Valid types: trends, peak-hours, by-service-type, wait-time, cancellation-rate, completion-rate`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Booking analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
