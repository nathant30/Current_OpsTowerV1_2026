/**
 * LTFRB Trip Reporting API
 * POST /api/compliance/ltfrb/trips/report - Report trip to LTFRB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLTFRBComplianceService } from '@/lib/compliance/ltfrb';

export async function POST(request: NextRequest) {
  try {
    const tripData = await request.json();

    if (!tripData.rideId || !tripData.driverId || !tripData.vehicleId) {
      return NextResponse.json(
        { success: false, error: 'rideId, driverId, and vehicleId are required' },
        { status: 400 }
      );
    }

    const service = getLTFRBComplianceService();
    const result = await service.logTripForLTFRB(tripData);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reporting trip:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to report trip',
      },
      { status: 500 }
    );
  }
}
