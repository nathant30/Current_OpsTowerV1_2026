/**
 * Insurance Verification API
 * GET /api/compliance/insurance/verify/:driverId - Verify driver insurance
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { driverId: string } }
) {
  try {
    const { driverId } = params;

    const result = await query(
      `SELECT * FROM insurance_verification
       WHERE driver_id = $1
         AND verification_status = 'verified'
         AND expiry_date > CURRENT_DATE
       ORDER BY expiry_date DESC
       LIMIT 1`,
      [driverId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: 'No valid insurance found for driver',
      });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      insurance: result.rows[0],
    });
  } catch (error) {
    console.error('Error verifying insurance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify insurance',
      },
      { status: 500 }
    );
  }
}
