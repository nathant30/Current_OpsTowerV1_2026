import { logger } from '@/lib/security/productionLogger';
/**
 * Maya Webhook Handler API Route
 *
 * POST /api/payments/maya/webhook
 * Receives and processes webhook events from Maya
 *
 * @module api/payments/maya/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMayaService } from '@/lib/payments/maya/service';
import { MayaWebhookPayload, MayaWebhookEvent } from '@/lib/payments/maya/types';

/**
 * POST /api/payments/maya/webhook
 * Handle webhook notifications from Maya
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody) as MayaWebhookEvent;

    // Extract headers
    const headers = {
      'x-maya-signature': request.headers.get('x-maya-signature') || undefined,
      'content-type': request.headers.get('content-type') || undefined,
      'user-agent': request.headers.get('user-agent') || undefined,
    };

    // Build webhook payload
    const webhookPayload: MayaWebhookPayload = {
      headers,
      body,
      rawBody,
    };

    // Get Maya service
    const mayaService = getMayaService();

    // Process webhook
    const result = await mayaService.handleWebhook(webhookPayload);

    if (!result.success) {
      logger.error('Webhook processing failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // Log successful processing
    logger.info('Webhook processed successfully:', {
      paymentId: result.paymentId,
      transactionId: result.transactionId,
      statusChange: `${result.previousStatus} -> ${result.newStatus}`,
    });

    // Return 200 OK to acknowledge receipt
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook processed successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Maya webhook handler error:', error);

    // Return 500 to trigger Maya retry
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/maya/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Maya webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
