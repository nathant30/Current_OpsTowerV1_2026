/**
 * DPA Privacy Notice API
 * GET /api/compliance/dpa/privacy-notice - Get current privacy notice
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const noticeType = searchParams.get('noticeType') || 'privacy_policy';
    const language = searchParams.get('language') || 'en';

    const result = await query(
      `SELECT * FROM dpa_privacy_notices
       WHERE notice_type = $1
         AND language = $2
         AND is_current = true
         AND is_published = true
       LIMIT 1`,
      [noticeType, language]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Privacy notice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notice: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching privacy notice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch privacy notice',
      },
      { status: 500 }
    );
  }
}
