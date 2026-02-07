// Emergency Contact Verification Code Resend API
// POST /api/emergency/contacts/[id]/resend - Resend verification code

import { NextRequest, NextResponse } from 'next/server';
import { emergencyContactsService } from '@/lib/emergency/emergency-contacts-service';
import { logger } from '@/lib/security/productionLogger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await emergencyContactsService.resendVerificationCode(params.id);

    return NextResponse.json({
      success: true,
      message: 'Verification code resent successfully'
    });
  } catch (error: any) {
    logger.error(`Failed to resend verification code for contact ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to resend verification code', details: error.message },
      { status: 500 }
    );
  }
}
