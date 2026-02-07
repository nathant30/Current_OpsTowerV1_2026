/**
 * BIR Monthly Reports API
 * GET /api/compliance/bir/reports/monthly - Get monthly reports
 * POST /api/compliance/bir/reports/monthly - Generate monthly report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBIRTaxService } from '@/lib/compliance/bir';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let sql = 'SELECT * FROM bir_monthly_reports WHERE 1=1';
    const params: any[] = [];

    if (year) {
      params.push(parseInt(year));
      sql += ` AND report_year = $${params.length}`;
    }

    if (month) {
      params.push(parseInt(month));
      sql += ` AND report_month = $${params.length}`;
    }

    sql += ' ORDER BY report_year DESC, report_month DESC LIMIT 12';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      reports: result.rows,
    });
  } catch (error) {
    console.error('Error fetching monthly reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch monthly reports',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { year, month } = await request.json();

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: 'year and month are required' },
        { status: 400 }
      );
    }

    const service = getBIRTaxService();
    const result = await service.generateMonthlySalesReport(year, month);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate monthly report',
      },
      { status: 500 }
    );
  }
}
