/**
 * Revenue Analytics API Routes
 *
 * GET /api/analytics/revenue?type=daily&start=...&end=...
 * GET /api/analytics/revenue?type=monthly&year=2026
 * GET /api/analytics/revenue?type=by-service-type
 * GET /api/analytics/revenue?type=growth&period=monthly
 * GET /api/analytics/revenue?type=projection&months=6
 * GET /api/analytics/revenue?type=by-region
 *
 * @module api/analytics/revenue
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'daily';

    switch (type) {
      case 'daily': {
        const startDate = searchParams.get('start')
          ? new Date(searchParams.get('start')!)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : new Date();

        const data = await analyticsService.getDailyRevenue(startDate, endDate);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        });
      }

      case 'monthly': {
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const data = await analyticsService.getMonthlyRevenue(year);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            year,
          },
        });
      }

      case 'by-service-type': {
        const startDate = searchParams.get('start') ? new Date(searchParams.get('start')!) : undefined;
        const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : undefined;

        const data = await analyticsService.getRevenueByServiceType(startDate, endDate);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'growth': {
        const period = (searchParams.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly';
        const data = await analyticsService.getRevenueGrowth(period);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            period,
          },
        });
      }

      case 'projection': {
        const months = parseInt(searchParams.get('months') || '6');
        const data = await analyticsService.getRevenueProjection(months);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            months,
          },
        });
      }

      case 'by-region': {
        const startDate = searchParams.get('start') ? new Date(searchParams.get('start')!) : undefined;
        const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : undefined;

        const data = await analyticsService.getRevenueByRegion(startDate, endDate);

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
            error: `Unknown revenue analytics type: ${type}. Valid types: daily, monthly, by-service-type, growth, projection, by-region`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Revenue analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
