/**
 * LTFRB Driver Verification API
 * POST /api/compliance/ltfrb/drivers/verify - Verify driver against LTFRB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLTFRBComplianceService } from '@/lib/compliance/ltfrb';

export async function POST(request: NextRequest) {
  try {
    const { driverId, licenseNumber } = await request.json();

    if (!driverId || !licenseNumber) {
      return NextResponse.json(
        { success: false, error: 'driverId and licenseNumber are required' },
        { status: 400 }
      );
    }

    const service = getLTFRBComplianceService();
    const result = await service.verifyDriver(driverId, licenseNumber);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error verifying driver:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify driver',
      },
      { status: 500 }
    );
  }
}
