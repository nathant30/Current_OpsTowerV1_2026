/**
 * Unified Payment Initiation API
 * POST /api/payments/initiate
 *
 * Routes payment to appropriate gateway (Maya, GCash, or Cash)
 * based on user preference or auto-selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentOrchestrator, UnifiedPaymentRequest } from '@/lib/payments/orchestrator';
import { logger } from '@/lib/security/productionLogger';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    const validation = validatePaymentRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid payment request',
            details: validation.errors,
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      );
    }

    // Build unified payment request
    const paymentRequest: UnifiedPaymentRequest = {
      amount: body.amount,
      currency: body.currency || 'PHP',
      description: body.description,
      userId: body.userId,
      userType: body.userType || 'passenger',
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      bookingId: body.bookingId,
      preferredProvider: body.preferredProvider,
      successUrl: body.successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
      failureUrl: body.failureUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payments/failure`,
      metadata: body.metadata,
    };

    // Initiate payment through orchestrator
    const orchestrator = getPaymentOrchestrator();
    const paymentResponse = await orchestrator.initiatePayment(paymentRequest);

    const responseTime = Date.now() - startTime;

    // Log successful payment initiation
    logger.info('Payment initiated successfully', {
      transactionId: paymentResponse.transactionId,
      provider: paymentResponse.provider,
      amount: paymentResponse.amount,
      responseTime,
      requestId,
    }, {
      component: 'UnifiedPaymentAPI',
      action: 'initiatePayment',
    });

    return NextResponse.json(
      {
        success: true,
        data: paymentResponse,
        timestamp: new Date(),
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Payment initiation failed', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'UnifiedPaymentAPI',
      action: 'initiatePayment',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PAYMENT_INITIATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to initiate payment',
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 500 }
    );
  }
}

// Validation helper
function validatePaymentRequest(body: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
    errors.push('amount must be a positive number');
  }

  if (body.amount && body.amount > 100000) {
    errors.push('amount exceeds maximum limit (PHP 100,000)');
  }

  if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
    errors.push('description is required');
  }

  if (!body.userId || typeof body.userId !== 'string') {
    errors.push('userId is required');
  }

  if (!body.customerName || typeof body.customerName !== 'string') {
    errors.push('customerName is required');
  }

  if (!body.customerEmail || typeof body.customerEmail !== 'string' || !isValidEmail(body.customerEmail)) {
    errors.push('valid customerEmail is required');
  }

  if (body.preferredProvider && !['maya', 'gcash', 'cash'].includes(body.preferredProvider)) {
    errors.push('preferredProvider must be one of: maya, gcash, cash');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
