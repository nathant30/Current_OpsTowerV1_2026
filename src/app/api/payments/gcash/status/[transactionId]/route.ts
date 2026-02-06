/**
 * GCash Payment Status Query API Route
 *
 * GET /api/payments/gcash/status/[transactionId]
 *
 * Query current payment status from database
 * Optionally sync with EBANX for real-time status
 *
 * @module api/payments/gcash/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGCashService } from '@/lib/payments/gcash/service';

/**
 * GET /api/payments/gcash/status/[transactionId]
 *
 * Query payment status
 *
 * Query Parameters:
 * - sync: boolean (optional) - Sync with EBANX API for real-time status
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     transactionId: string,
 *     status: string,
 *     amount: number,
 *     currency: string,
 *     createdAt: string,
 *     updatedAt: string,
 *     completedAt?: string,
 *     failureReason?: string
 *   }
 * }
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

    // Check if sync with EBANX is requested
    const searchParams = request.nextUrl.searchParams;
    const sync = searchParams.get('sync') === 'true';

    // Get payment service
    const service = getGCashService();

    // Query payment status
    const status = await service.getPaymentStatus(transactionId, sync);

    // Return status
    return NextResponse.json({
      success: true,
      data: {
        transactionId: status.transactionId,
        status: status.status,
        amount: status.amount,
        currency: status.currency,
        createdAt: status.createdAt.toISOString(),
        updatedAt: status.updatedAt.toISOString(),
        completedAt: status.completedAt?.toISOString(),
        failureReason: status.failureReason,
      },
    });
  } catch (error) {
    console.error('Payment status query failed:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query payment status',
      },
      { status: 500 }
    );
  }
}
