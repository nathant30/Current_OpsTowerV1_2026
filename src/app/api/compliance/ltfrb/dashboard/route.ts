/**
 * LTFRB Compliance Dashboard API
 * GET /api/compliance/ltfrb/dashboard - Get LTFRB compliance statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLTFRBComplianceService } from '@/lib/compliance/ltfrb';

export async function GET(request: NextRequest) {
  try {
    const service = getLTFRBComplianceService();
    const statistics = await service.getStatistics();

    return NextResponse.json({
      success: true,
      dashboard: statistics,
    });
  } catch (error) {
    console.error('Error fetching LTFRB dashboard:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard',
      },
      { status: 500 }
    );
  }
}
