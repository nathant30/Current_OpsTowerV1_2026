import { logger } from '@/lib/security/productionLogger';
/**
 * Maya Payment Status Query API Route
 *
 * GET /api/payments/maya/status/:transactionId
 * Query payment status by transaction ID
 *
 * @module api/payments/maya/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMayaService } from '@/lib/payments/maya/service';

/**
 * GET /api/payments/maya/status/:transactionId
 * Get payment status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const { transactionId } = params;

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction ID is required',
        },
        { status: 400 }
      );
    }

    // Get sync parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const syncWithMaya = searchParams.get('sync') === 'true';

    // Get Maya service
    const mayaService = getMayaService();

    // Query payment status
    const paymentStatus = await mayaService.getPaymentStatus(transactionId, syncWithMaya);

    // Return payment status
    return NextResponse.json({
      success: true,
      data: {
        transactionId: paymentStatus.transactionId,
        checkoutId: paymentStatus.checkoutId,
        status: paymentStatus.status,
        amount: paymentStatus.amount,
        currency: paymentStatus.currency,
        createdAt: paymentStatus.createdAt.toISOString(),
        updatedAt: paymentStatus.updatedAt.toISOString(),
        completedAt: paymentStatus.completedAt?.toISOString(),
        failureReason: paymentStatus.failureReason,
      },
    });
  } catch (error) {
    logger.error('Maya payment status query failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query payment status',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/payments/maya/status/:transactionId
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
