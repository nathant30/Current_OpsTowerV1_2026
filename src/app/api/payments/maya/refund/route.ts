import { logger } from '@/lib/security/productionLogger';
/**
 * Maya Payment Refund API Route
 *
 * POST /api/payments/maya/refund
 * Process payment refund
 *
 * @module api/payments/maya/refund
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMayaService } from '@/lib/payments/maya/service';
import { RefundRequest } from '@/lib/payments/maya/types';
import { z } from 'zod';

// Request validation schema
const RefundRequestSchema = z.object({
  transactionId: z.string().min(1),
  amount: z.number().positive().optional(),
  reason: z.string().min(1).max(500),
  requestedBy: z.string().uuid(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/payments/maya/refund
 * Request a payment refund
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = RefundRequestSchema.parse(body);

    // Get Maya service
    const mayaService = getMayaService();

    // Create refund request
    const refundRequest: RefundRequest = {
      transactionId: validatedData.transactionId,
      amount: validatedData.amount,
      reason: validatedData.reason,
      requestedBy: validatedData.requestedBy,
      metadata: validatedData.metadata,
    };

    // Process refund
    const refundResponse = await mayaService.processRefund(refundRequest);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          refundId: refundResponse.refundId,
          transactionId: refundResponse.transactionId,
          amount: refundResponse.amount,
          currency: refundResponse.currency,
          status: refundResponse.status,
          mayaRefundId: refundResponse.mayaRefundId,
          createdAt: refundResponse.createdAt.toISOString(),
        },
        message: 'Refund request submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Maya refund request failed:', error);

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
        error: error instanceof Error ? error.message : 'Failed to process refund',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/payments/maya/refund
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
