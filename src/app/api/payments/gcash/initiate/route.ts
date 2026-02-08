import { logger } from '@/lib/security/productionLogger';
/**
 * GCash Payment Initiation API Route
 *
 * POST /api/payments/gcash/initiate
 *
 * Initiates a new GCash payment via EBANX
 * Returns redirect URL for customer to complete payment in GCash app
 *
 * @module api/payments/gcash/initiate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGCashService } from '@/lib/payments/gcash/service';
import { GCashPaymentRequest } from '@/lib/payments/gcash/types';
import { EBANXAPIError } from '@/lib/payments/gcash/types';

/**
 * POST /api/payments/gcash/initiate
 *
 * Initiate a GCash payment
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
 *   metadata?: object
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     transactionId: string,
 *     referenceNumber: string,
 *     redirectUrl: string,
 *     deepLinkUrl?: string,
 *     qrCodeUrl?: string,
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
    const paymentRequest: GCashPaymentRequest = {
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
      metadata: body.metadata || {},
    };

    // Get payment service
    const service = getGCashService();

    // Initiate payment
    const response = await service.initiatePayment(paymentRequest);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        transactionId: response.transactionId,
        referenceNumber: response.referenceNumber,
        redirectUrl: response.redirectUrl,
        deepLinkUrl: response.deepLinkUrl,
        qrCodeUrl: response.qrCodeUrl,
        amount: response.amount,
        currency: response.currency,
        status: response.status,
        expiresAt: response.expiresAt.toISOString(),
      },
      message: 'GCash payment initiated successfully',
    });
  } catch (error) {
    logger.error('GCash payment initiation failed:', error);

    // Handle EBANX API errors
    if (error instanceof EBANXAPIError) {
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
        error: 'Failed to initiate GCash payment. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/gcash/initiate
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
