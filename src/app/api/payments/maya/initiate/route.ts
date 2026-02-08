import { logger } from '@/lib/security/productionLogger';
/**
 * Maya Payment Initiation API Route
 *
 * POST /api/payments/maya/initiate
 *
 * Initiates a new Maya payment
 * Returns redirect URL for customer to complete payment on Maya checkout page
 *
 * @module api/payments/maya/initiate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMayaService } from '@/lib/payments/maya/service';
import { MayaPaymentRequest } from '@/lib/payments/maya/types';
import { MayaAPIError } from '@/lib/payments/maya/types';

/**
 * POST /api/payments/maya/initiate
 *
 * Initiate a Maya payment
 *
 * Request Body:
 * {
 *   amount: number,
 *   description: string,
 *   userId: string,
 *   userType: 'passenger' | 'driver' | 'operator',
 *   customerName: string,
 *   customerEmail: string,
 *   customerPhone?: string,
 *   bookingId?: string,
 *   successUrl: string,
 *   failureUrl: string,
 *   cancelUrl?: string,
 *   metadata?: object
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     transactionId: string,
 *     referenceNumber: string,
 *     checkoutId: string,
 *     redirectUrl: string,
 *     amount: number,
 *     currency: string,
 *     expiresAt: string,
 *     status: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'amount',
      'description',
      'userId',
      'userType',
      'customerName',
      'customerEmail',
      'successUrl',
      'failureUrl',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`,
          },
          { status: 400 }
        );
      }
    }

    // Build payment request
    const paymentRequest: MayaPaymentRequest = {
      amount: parseFloat(body.amount),
      currency: body.currency || 'PHP',
      description: body.description,
      userId: body.userId,
      userType: body.userType,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      bookingId: body.bookingId,
      successUrl: body.successUrl,
      failureUrl: body.failureUrl,
      cancelUrl: body.cancelUrl,
      metadata: body.metadata || {},
    };

    // Get payment service
    const service = getMayaService();

    // Initiate payment
    const response = await service.initiatePayment(paymentRequest);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        transactionId: response.transactionId,
        referenceNumber: response.referenceNumber,
        checkoutId: response.checkoutId,
        redirectUrl: response.redirectUrl,
        amount: response.amount,
        currency: response.currency,
        status: response.status,
        expiresAt: response.expiresAt.toISOString(),
      },
      message: 'Maya payment initiated successfully',
    });
  } catch (error) {
    logger.error('Maya payment initiation failed:', error);

    // Handle Maya API errors
    if (error instanceof MayaAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode || 400 }
      );
    }

    // Handle validation errors
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate Maya payment. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/maya/initiate
 *
 * Method not allowed
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to initiate a payment.',
    },
    { status: 405 }
  );
}
