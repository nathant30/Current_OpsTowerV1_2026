/**
 * DPA Data Export API
 * GET /api/compliance/dpa/data-export - Export user data (Right to Access)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDataSubjectRightsService } from '@/lib/compliance/dpa';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const service = getDataSubjectRightsService();
    const result = await service.exportUserData(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data',
      },
      { status: 500 }
    );
  }
}
