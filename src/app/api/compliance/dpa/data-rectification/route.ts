/**
 * DPA Data Rectification API
 * POST /api/compliance/dpa/data-rectification - Rectify user data (Right to Rectification)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDataSubjectRightsService } from '@/lib/compliance/dpa';

export async function POST(request: NextRequest) {
  try {
    const { userId, corrections } = await request.json();

    if (!userId || !corrections) {
      return NextResponse.json(
        { success: false, error: 'userId and corrections are required' },
        { status: 400 }
      );
    }

    const service = getDataSubjectRightsService();
    const result = await service.rectifyUserData(userId, corrections);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error rectifying user data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rectify data',
      },
      { status: 500 }
    );
  }
}
