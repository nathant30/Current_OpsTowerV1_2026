import { logger } from '@/lib/security/productionLogger';
/**
 * GCash Webhook Handler API Route
 *
 * POST /api/payments/gcash/webhook
 *
 * Receives webhooks from EBANX when payment status changes
 * Verifies signature, updates database, logs events
 *
 * @module api/payments/gcash/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGCashService } from '@/lib/payments/gcash/service';
import { EBANXWebhookPayload, EBANXWebhookEvent } from '@/lib/payments/gcash/types';

/**
 * POST /api/payments/gcash/webhook
 *
 * Handle EBANX webhook notification
 *
 * EBANX sends webhooks when payment status changes:
 * - Payment confirmed
 * - Payment cancelled
 * - Payment failed
 * - Payment expired
 * - Refund processed
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Parse JSON body
    let body: EBANXWebhookEvent;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload',
        },
        { status: 400 }
      );
    }

    // Extract headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Build webhook payload
    const payload: EBANXWebhookPayload = {
      headers: {
        'x-ebanx-signature': headers['x-ebanx-signature'],
        'content-type': headers['content-type'],
        'user-agent': headers['user-agent'],
      },
      body,
      rawBody,
    };

    // Get payment service
    const service = getGCashService();

    // Process webhook
    const results = await service.handleWebhook(payload);

    // Log results
    logger.info('Webhook processed:', {
      notificationType: body.notification_type,
      hashCodes: body.hash_codes,
      results,
    });

    // Return success (EBANX expects 200 OK)
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      results: results.map((r) => ({
        transactionId: r.transactionId,
        status: r.newStatus,
        success: r.success,
      })),
    });
  } catch (error) {
    logger.error('Webhook processing failed:', error);

    // Return 200 OK even on error to prevent EBANX retry storms
    // Log error internally for investigation
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed',
      message: 'Error logged for investigation',
    });
  }
}

/**
 * GET /api/payments/gcash/webhook
 *
 * Method not allowed
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. This endpoint only accepts POST requests from EBANX.',
    },
    { status: 405 }
  );
}
