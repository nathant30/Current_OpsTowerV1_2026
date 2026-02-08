import { logger } from '@/lib/security/productionLogger';
/**
 * Maya Payment Initiation API Route
 *
 * POST /api/payments/maya/initiate
 * Creates a new Maya checkout session and returns redirect URL
 *
 * @module api/payments/maya/initiate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMayaService } from '@/lib/payments/maya/service';
import { MayaPaymentRequest } from '@/lib/payments/maya/types';
import { z } from 'zod';

// Request validation schema
const PaymentRequestSchema = z.object({
  amount: z.number().positive().max(100000),
  currency: z.string().optional().default('PHP'),
  description: z.string().min(1).max(500),
  userId: z.string().uuid(),
  userType: z.enum(['passenger', 'driver', 'operator']),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  bookingId: z.string().uuid().optional(),
  successUrl: z.string().url(),
  failureUrl: z.string().url(),
  cancelUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/payments/maya/initiate
 * Initiate a new Maya payment
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = PaymentRequestSchema.parse(body);

    // Get Maya service
    const mayaService = getMayaService();

    // Create payment request
    const paymentRequest: MayaPaymentRequest = {
      amount: validatedData.amount,
      currency: validatedData.currency,
      description: validatedData.description,
      userId: validatedData.userId,
      userType: validatedData.userType,
      customerName: validatedData.customerName,
      customerEmail: validatedData.customerEmail,
      customerPhone: validatedData.customerPhone,
      bookingId: validatedData.bookingId,
      successUrl: validatedData.successUrl,
      failureUrl: validatedData.failureUrl,
      cancelUrl: validatedData.cancelUrl,
      metadata: validatedData.metadata,
    };

    // Initiate payment
    const paymentResponse = await mayaService.initiatePayment(paymentRequest);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          transactionId: paymentResponse.transactionId,
          checkoutId: paymentResponse.checkoutId,
          redirectUrl: paymentResponse.redirectUrl,
          amount: paymentResponse.amount,
          currency: paymentResponse.currency,
          status: paymentResponse.status,
          expiresAt: paymentResponse.expiresAt.toISOString(),
        },
        message: 'Maya payment initiated successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Maya payment initiation failed:', error);

    // Validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Maya payment',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/payments/maya/initiate
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
