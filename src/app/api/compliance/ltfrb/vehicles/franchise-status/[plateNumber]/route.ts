/**
 * LTFRB Vehicle Franchise Status API
 * GET /api/compliance/ltfrb/vehicles/franchise-status/:plateNumber - Get franchise status
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { plateNumber: string } }
) {
  try {
    const { plateNumber } = params;

    const result = await query(
      `SELECT * FROM ltfrb_vehicles WHERE plate_number = $1 ORDER BY created_at DESC LIMIT 1`,
      [plateNumber]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    return NextResponse.json({
      success: true,
      vehicle: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching franchise status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch franchise status',
      },
      { status: 500 }
    );
  }
}
