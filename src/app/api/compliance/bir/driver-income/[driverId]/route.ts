/**
 * BIR Driver Income API
 * GET /api/compliance/bir/driver-income/:driverId - Get driver income (Form 2316)
 * POST /api/compliance/bir/driver-income/:driverId - Generate driver income certificate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBIRTaxService } from '@/lib/compliance/bir';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { driverId: string } }
) {
  try {
    const { driverId } = params;
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');

    let sql = 'SELECT * FROM bir_driver_income WHERE driver_id = $1';
    const queryParams: any[] = [driverId];

    if (year) {
      queryParams.push(parseInt(year));
      sql += ` AND income_year = $${queryParams.length}`;
    }

    sql += ' ORDER BY income_year DESC, income_month DESC LIMIT 12';

    const result = await query(sql, queryParams);

    return NextResponse.json({
      success: true,
      income: result.rows,
    });
  } catch (error) {
    console.error('Error fetching driver income:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch driver income',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { driverId: string } }
) {
  try {
    const { driverId } = params;
    const { year, month } = await request.json();

    if (!year) {
      return NextResponse.json(
        { success: false, error: 'year is required' },
        { status: 400 }
      );
    }

    const service = getBIRTaxService();
    const result = await service.generateDriverIncome(driverId, year, month);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating driver income:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate driver income',
      },
      { status: 500 }
    );
  }
}
