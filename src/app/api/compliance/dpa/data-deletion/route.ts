/**
 * DPA Data Deletion API
 * POST /api/compliance/dpa/data-deletion - Delete user data (Right to Erasure)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDataSubjectRightsService } from '@/lib/compliance/dpa';

export async function POST(request: NextRequest) {
  try {
    const { userId, reason } = await request.json();

    if (!userId || !reason) {
      return NextResponse.json(
        { success: false, error: 'userId and reason are required' },
        { status: 400 }
      );
    }

    const service = getDataSubjectRightsService();
    const result = await service.deleteUserData(userId, reason);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting user data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete data',
      },
      { status: 500 }
    );
  }
}
