// Emergency Contact Verification API
// POST /api/emergency/contacts/[id]/verify - Verify contact with code
// POST /api/emergency/contacts/[id]/verify/resend - Resend verification code

import { NextRequest, NextResponse } from 'next/server';
import { emergencyContactsService } from '@/lib/emergency/emergency-contacts-service';
import { logger } from '@/lib/security/productionLogger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (!body.code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const result = await emergencyContactsService.verifyEmergencyContact(
      params.id,
      body.code
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.contact
    });
  } catch (error: any) {
    logger.error(`Failed to verify emergency contact ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to verify emergency contact', details: error.message },
      { status: 500 }
    );
  }
}
