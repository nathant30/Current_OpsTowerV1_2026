/**
 * Unified Payment Webhook API
 * POST /api/payments/webhook
 *
 * Routes webhooks to appropriate gateway handler
 * Supports both Maya and GCash webhook formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentOrchestrator, PaymentProvider } from '@/lib/payments/orchestrator';
import { logger } from '@/lib/security/productionLogger';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Get headers
    const headers = Object.fromEntries(request.headers.entries());

    // Determine provider from webhook signature or payload
    const provider = detectWebhookProvider(headers, body);

    if (!provider) {
      logger.warn('Unable to determine webhook provider', {
        headers,
        requestId,
      }, {
        component: 'UnifiedWebhookAPI',
        action: 'routeWebhook',
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNKNOWN_PROVIDER',
            message: 'Unable to determine webhook provider',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      );
    }

    // Build webhook payload
    const webhookPayload = {
      headers,
      body,
      rawBody,
    };

    // Route to appropriate handler
    const orchestrator = getPaymentOrchestrator();
    const result = await orchestrator.routeWebhook(provider, webhookPayload);

    const responseTime = Date.now() - startTime;

    // Log webhook processing
    logger.info('Webhook processed successfully', {
      provider,
      result,
      responseTime,
      requestId,
    }, {
      component: 'UnifiedWebhookAPI',
      action: 'routeWebhook',
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        timestamp: new Date(),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Webhook processing failed', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'UnifiedWebhookAPI',
      action: 'routeWebhook',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to process webhook',
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * Detect payment provider from webhook headers or payload
 */
function detectWebhookProvider(
  headers: Record<string, string>,
  body: any
): PaymentProvider | null {
  // Check for Maya signature header
  if (headers['x-maya-signature']) {
    return 'maya';
  }

  // Check for EBANX signature header
  if (headers['x-ebanx-signature']) {
    return 'gcash';
  }

  // Check body structure for Maya webhook
  if (body.name && body.data && body.data.checkoutId) {
    return 'maya';
  }

  // Check body structure for EBANX webhook
  if (body.notification_type && body.hash_codes) {
    return 'gcash';
  }

  // Unable to determine provider
  return null;
}
