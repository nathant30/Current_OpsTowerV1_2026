import { logger } from '@/lib/security/productionLogger';
/**
 * GCash Refund API Route
 *
 * POST /api/payments/gcash/refund
 *
 * Process refund request for a completed payment
 * Creates refund record (pending approval) before processing via EBANX
 *
 * @module api/payments/gcash/refund
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGCashService } from '@/lib/payments/gcash/service';
import { RefundRequest } from '@/lib/payments/gcash/types';

/**
 * POST /api/payments/gcash/refund
 *
 * Request a refund for a completed payment
 *
 * Request Body:
 * {
 *   transactionId: string,
 *   amount?: number (optional - defaults to full refund),
 *   reason: string,
 *   requestedBy: string (user ID)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     refundId: string,
 *     transactionId: string,
 *     amount: number,
 *     currency: string,
 *     status: 'pending',
 *     createdAt: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction ID is required',
        },
        { status: 400 }
      );
    }

    if (!body.reason || body.reason.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Refund reason is required',
        },
        { status: 400 }
      );
    }

    if (!body.requestedBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'requestedBy (user ID) is required',
        },
        { status: 400 }
      );
    }

    // Build refund request
    const refundRequest: RefundRequest = {
      transactionId: body.transactionId,
      amount: body.amount ? parseFloat(body.amount) : undefined,
      reason: body.reason,
      requestedBy: body.requestedBy,
      metadata: body.metadata || {},
    };

    // Get payment service
    const service = getGCashService();

    // Process refund
    const response = await service.processRefund(refundRequest);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        refundId: response.refundId,
        transactionId: response.transactionId,
        amount: response.amount,
        currency: response.currency,
        status: response.status,
        createdAt: response.createdAt.toISOString(),
      },
      message: 'Refund request created successfully. Pending approval.',
    });
  } catch (error) {
    logger.error('Refund request failed:', error);

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
        error: 'Failed to process refund request. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/gcash/refund
 *
 * Method not allowed
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to request a refund.',
    },
    { status: 405 }
  );
}
