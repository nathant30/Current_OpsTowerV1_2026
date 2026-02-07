/**
 * BIR Quarterly Reports API
 * POST /api/compliance/bir/reports/quarterly - Generate quarterly report (Form 2550Q)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBIRTaxService } from '@/lib/compliance/bir';

export async function POST(request: NextRequest) {
  try {
    const { year, quarter } = await request.json();

    if (!year || !quarter || quarter < 1 || quarter > 4) {
      return NextResponse.json(
        { success: false, error: 'year and quarter (1-4) are required' },
        { status: 400 }
      );
    }

    const service = getBIRTaxService();
    const result = await service.generateQuarterlyReport(year, quarter);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating quarterly report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate quarterly report',
      },
      { status: 500 }
    );
  }
}
