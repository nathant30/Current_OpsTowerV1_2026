/**
 * Financial Reports API Routes
 *
 * GET /api/analytics/reports?type=monthly&year=2026&month=1
 * GET /api/analytics/reports?type=quarterly&year=2026&quarter=1
 * GET /api/analytics/reports?type=annual&year=2026
 * GET /api/analytics/reports?type=tax-summary&year=2026
 * GET /api/analytics/reports?type=commission&start=...&end=...
 *
 * @module api/analytics/reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'monthly';

    switch (type) {
      case 'monthly': {
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

        if (month < 1 || month > 12) {
          return NextResponse.json(
            { success: false, error: 'Month must be between 1 and 12' },
            { status: 400 }
          );
        }

        const data = await analyticsService.getMonthlyFinancialReport(year, month);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            reportType: 'monthly',
          },
        });
      }

      case 'quarterly': {
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const quarter = parseInt(searchParams.get('quarter') || '1');

        if (quarter < 1 || quarter > 4) {
          return NextResponse.json(
            { success: false, error: 'Quarter must be between 1 and 4' },
            { status: 400 }
          );
        }

        const data = await analyticsService.getQuarterlyFinancialReport(year, quarter);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            reportType: 'quarterly',
          },
        });
      }

      case 'annual': {
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

        const data = await analyticsService.getAnnualFinancialReport(year);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            reportType: 'annual',
          },
        });
      }

      case 'tax-summary': {
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

        const data = await analyticsService.getTaxSummary(year);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            reportType: 'tax-summary',
          },
        });
      }

      case 'commission': {
        const startDate = searchParams.get('start')
          ? new Date(searchParams.get('start')!)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : new Date();

        const data = await analyticsService.getCommissionReport(startDate, endDate);

        return NextResponse.json({
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            reportType: 'commission',
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown report type: ${type}. Valid types: monthly, quarterly, annual, tax-summary, commission`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Financial reports API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
