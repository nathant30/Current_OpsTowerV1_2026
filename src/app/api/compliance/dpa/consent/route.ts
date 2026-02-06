/**
 * DPA Consent Management API
 *
 * POST /api/compliance/dpa/consent - Record or update consent
 * GET /api/compliance/dpa/consent - Get user consents
 * DELETE /api/compliance/dpa/consent - Withdraw consent
 *
 * @module api/compliance/dpa/consent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDPAConsentService } from '@/lib/compliance/dpa';
import type { ConsentRequest } from '@/lib/compliance/dpa/types';

/**
 * POST /api/compliance/dpa/consent
 * Record user consent
 */
export async function POST(request: NextRequest) {
  try {
    const body: ConsentRequest = await request.json();

    // Validate required fields
    if (!body.userId || !body.userType || !body.consentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, userType, consentType',
        },
        { status: 400 }
      );
    }

    const service = getDPAConsentService();
    const result = await service.recordConsent(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error recording consent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record consent',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/compliance/dpa/consent
 * Get user consents
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const consentType = searchParams.get('consentType');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 }
      );
    }

    const service = getDPAConsentService();
    const consents = await service.getUserConsents(userId, consentType as any);

    return NextResponse.json({
      success: true,
      consents,
    });
  } catch (error) {
    console.error('Error fetching consents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch consents',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/compliance/dpa/consent
 * Withdraw consent
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const consentType = searchParams.get('consentType');
    const reason = searchParams.get('reason');

    if (!userId || !consentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId and consentType are required',
        },
        { status: 400 }
      );
    }

    const service = getDPAConsentService();
    const result = await service.withdrawConsent(userId, consentType as any, reason || undefined);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error withdrawing consent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to withdraw consent',
      },
      { status: 500 }
    );
  }
}
