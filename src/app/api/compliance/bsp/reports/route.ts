/**
 * BSP Compliance Reports API
 *
 * GET /api/compliance/bsp/reports - List reports
 * POST /api/compliance/bsp/reports - Generate new report
 *
 * @module api/compliance/bsp/reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBSPReportService } from '@/lib/compliance/bsp/report-generation';
import { BSPReportType } from '@/lib/compliance/bsp/types';

/**
 * GET /api/compliance/bsp/reports
 *
 * Get BSP reports with optional filters
 *
 * Query params:
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - reportType: Filter by report type
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const reportType = searchParams.get('reportType') as BSPReportType | null;

    const reportService = getBSPReportService();

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const reports = await reportService.getReports(start, end, reportType || undefined);

    return NextResponse.json({
      success: true,
      reports,
      count: reports.length,
    });
  } catch (error) {
    console.error('Failed to get BSP reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve BSP reports',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/compliance/bsp/reports
 *
 * Generate a new BSP report
 *
 * Body:
 * - reportType: 'daily' | 'monthly' | 'suspicious'
 * - date: Report date (for daily reports) - ISO string
 * - year: Report year (for monthly reports)
 * - month: Report month (for monthly reports)
 * - startDate: Start date (for suspicious activity reports)
 * - endDate: End date (for suspicious activity reports)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, date, year, month, startDate, endDate } = body;

    if (!reportType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report type is required',
        },
        { status: 400 }
      );
    }

    const reportService = getBSPReportService();
    let result;

    switch (reportType) {
      case 'daily':
        if (!date) {
          return NextResponse.json(
            {
              success: false,
              error: 'Date is required for daily reports',
            },
            { status: 400 }
          );
        }
        result = await reportService.generateDailyReport({
          reportDate: new Date(date),
        });
        break;

      case 'monthly':
        if (!year || !month) {
          return NextResponse.json(
            {
              success: false,
              error: 'Year and month are required for monthly reports',
            },
            { status: 400 }
          );
        }
        result = await reportService.generateMonthlyReport({
          year: parseInt(year),
          month: parseInt(month),
        });
        break;

      case 'suspicious':
        if (!startDate || !endDate) {
          return NextResponse.json(
            {
              success: false,
              error: 'Start date and end date are required for suspicious activity reports',
            },
            { status: 400 }
          );
        }
        result = await reportService.generateSuspiciousActivityReport(
          new Date(startDate),
          new Date(endDate)
        );
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Invalid report type: ${reportType}`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Failed to generate BSP report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate BSP report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
