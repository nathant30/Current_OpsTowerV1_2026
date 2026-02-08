import { logger } from '@/lib/security/productionLogger';
/**
 * Payment History API Route
 *
 * GET /api/payments/history
 *
 * Retrieves payment history for a user
 *
 * @module api/payments/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/payments/history
 *
 * Get payment history for a user
 *
 * Query Parameters:
 * - userId: User ID (required)
 * - filter: Status filter (all, completed, pending, failed, refunded)
 * - limit: Number of records (default: 50)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     payments: Payment[],
 *     total: number,
 *     limit: number,
 *     offset: number
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate user ID
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required'
        },
        { status: 400 }
      );
    }

    // Build query
    let sql = `
      SELECT
        id,
        transaction_id as "transactionId",
        reference_number as "referenceNumber",
        provider,
        provider_transaction_id as "providerTransactionId",
        amount,
        currency,
        payment_method as "paymentMethod",
        status,
        description,
        booking_id as "bookingId",
        created_at as "createdAt",
        updated_at as "updatedAt",
        completed_at as "completedAt",
        failure_reason as "failureReason"
      FROM payments
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    // Apply status filter
    if (filter !== 'all') {
      sql += ` AND status = $${paramIndex}`;
      params.push(filter);
      paramIndex++;
    }

    // Order by created date (newest first)
    sql += ` ORDER BY created_at DESC`;

    // Apply pagination
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Execute query
    const result = await query(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM payments
      WHERE user_id = $1
    `;
    const countParams: any[] = [userId];

    if (filter !== 'all') {
      countSql += ` AND status = $2`;
      countParams.push(filter);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Format response
    const payments = result.rows.map((row) => ({
      id: row.id,
      transactionId: row.transactionId,
      referenceNumber: row.referenceNumber,
      provider: row.provider,
      providerTransactionId: row.providerTransactionId,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paymentMethod: row.paymentMethod,
      status: row.status,
      description: row.description,
      bookingId: row.bookingId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
      failureReason: row.failureReason
    }));

    return NextResponse.json({
      success: true,
      data: {
        payments,
        total,
        limit,
        offset
      }
    });

  } catch (error) {
    logger.error('Payment history fetch failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payment history'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/history
 *
 * Method not allowed
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to fetch payment history.'
    },
    { status: 405 }
  );
}
