/**
 * BSP Flagged Transactions API
 *
 * GET /api/compliance/bsp/flagged-transactions - Get flagged transactions
 * PATCH /api/compliance/bsp/flagged-transactions/[id] - Review transaction
 *
 * @module api/compliance/bsp/flagged-transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAMLMonitoringService } from '@/lib/compliance/bsp/aml-monitoring';

/**
 * GET /api/compliance/bsp/flagged-transactions
 *
 * Get flagged transactions for review
 *
 * Query params:
 * - limit: Number of transactions to return (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    const amlService = getAMLMonitoringService();
    const flaggedTransactions = await amlService.getFlaggedTransactions(limit);

    return NextResponse.json({
      success: true,
      transactions: flaggedTransactions,
      count: flaggedTransactions.length,
    });
  } catch (error) {
    console.error('Failed to get flagged transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve flagged transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/compliance/bsp/flagged-transactions/[id]
 *
 * Review a flagged transaction
 *
 * Body:
 * - transactionId: Transaction ID
 * - reviewedBy: User ID of reviewer
 * - reviewNotes: Review notes
 * - reportToBsp: Whether to report to BSP (default: false)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, reviewedBy, reviewNotes, reportToBsp = false } = body;

    if (!transactionId || !reviewedBy || !reviewNotes) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction ID, reviewer ID, and review notes are required',
        },
        { status: 400 }
      );
    }

    const amlService = getAMLMonitoringService();
    await amlService.reviewAMLRecord(transactionId, reviewedBy, reviewNotes, reportToBsp);

    return NextResponse.json({
      success: true,
      message: 'Transaction reviewed successfully',
      reportedToBsp: reportToBsp,
    });
  } catch (error) {
    console.error('Failed to review transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to review transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
