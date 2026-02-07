/**
 * LTFRB Reports API
 * GET /api/compliance/ltfrb/reports - Get LTFRB reports
 * POST /api/compliance/ltfrb/reports - Generate new report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLTFRBComplianceService } from '@/lib/compliance/ltfrb';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('reportType');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let sql = 'SELECT * FROM ltfrb_report_submissions WHERE 1=1';
    const params: any[] = [];

    if (reportType) {
      params.push(reportType);
      sql += ` AND report_type = $${params.length}`;
    }

    if (year) {
      params.push(parseInt(year));
      sql += ` AND reporting_year = $${params.length}`;
    }

    if (month) {
      params.push(parseInt(month));
      sql += ` AND reporting_month = $${params.length}`;
    }

    sql += ' ORDER BY generated_at DESC LIMIT 50';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      reports: result.rows,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reports',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { reportType, year, month, date } = await request.json();

    const service = getLTFRBComplianceService();
    let result;

    if (reportType === 'daily_trips' && date) {
      result = await service.generateDailyReport(new Date(date));
    } else if (reportType === 'monthly_reconciliation' && year && month) {
      result = await service.generateMonthlyReport(year, month);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid report parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      },
      { status: 500 }
    );
  }
}
