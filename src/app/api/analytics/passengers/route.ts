/**
 * Passenger Analytics API Routes
 *
 * GET /api/analytics/passengers?type=retention&cohort=...
 * GET /api/analytics/passengers?type=lifetime-value&passengerId=...
 * GET /api/analytics/passengers?type=segmentation
 * GET /api/analytics/passengers?type=growth
 * GET /api/analytics/passengers?type=churn
 * GET /api/analytics/passengers?type=frequency
 *
 * @module api/analytics/passengers
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'segmentation';
    const passengerId = searchParams.get('passengerId');

    switch (type) {
      case 'retention': {
        const cohort = searchParams.get('cohort') || undefined;
        const data = await analyticsService.getPassengerRetention(cohort);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            cohort,
          },
        });
      }

      case 'lifetime-value': {
        if (!passengerId) {
          return NextResponse.json(
            { success: false, error: 'passengerId is required for lifetime value' },
            { status: 400 }
          );
        }

        const value = await analyticsService.getPassengerLifetimeValue(passengerId);

        return NextResponse.json({
          success: true,
          data: { passengerId, lifetimeValue: value },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'segmentation': {
        const data = await analyticsService.getPassengerSegmentation();

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'growth': {
        const data = await analyticsService.getNewPassengerGrowth();

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'churn': {
        const data = await analyticsService.getPassengerChurnRate();

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'frequency': {
        const data = await analyticsService.getPassengerBookingFrequency();

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
            error: `Unknown passenger analytics type: ${type}. Valid types: retention, lifetime-value, segmentation, growth, churn, frequency`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Passenger analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
