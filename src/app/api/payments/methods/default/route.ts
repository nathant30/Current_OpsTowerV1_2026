/**
 * Default Payment Method API
 * GET/PUT /api/payments/methods/default
 *
 * Get or set user's default payment method
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentOrchestrator, PaymentProvider } from '@/lib/payments/orchestrator';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Get user ID from query params (in production, get from authenticated session)
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      );
    }

    // Get default payment method
    const orchestrator = getPaymentOrchestrator();
    const defaultMethod = await orchestrator.getUserDefaultPaymentMethod(userId);

    const responseTime = Date.now() - startTime;

    logger.info('Default payment method retrieved', {
      userId,
      defaultMethod,
      responseTime,
      requestId,
    }, {
      component: 'PaymentMethodsAPI',
      action: 'getDefaultMethod',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          userId,
          defaultPaymentMethod: defaultMethod,
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Failed to get default payment method', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'PaymentMethodsAPI',
      action: 'getDefaultMethod',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GET_DEFAULT_METHOD_FAILED',
          message: 'Failed to retrieve default payment method',
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    if (!body.userId || !body.paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'userId and paymentMethod are required',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!['maya', 'gcash', 'cash'].includes(body.paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PAYMENT_METHOD',
            message: 'paymentMethod must be one of: maya, gcash, cash',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      );
    }

    // Set default payment method
    const orchestrator = getPaymentOrchestrator();
    await orchestrator.setUserDefaultPaymentMethod(
      body.userId,
      body.paymentMethod as PaymentProvider
    );

    const responseTime = Date.now() - startTime;

    logger.info('Default payment method updated', {
      userId: body.userId,
      paymentMethod: body.paymentMethod,
      responseTime,
      requestId,
    }, {
      component: 'PaymentMethodsAPI',
      action: 'setDefaultMethod',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: body.userId,
          defaultPaymentMethod: body.paymentMethod,
          updatedAt: new Date(),
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Failed to set default payment method', {
      error: (error as Error).message,
      responseTime,
      requestId,
    }, {
      component: 'PaymentMethodsAPI',
      action: 'setDefaultMethod',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SET_DEFAULT_METHOD_FAILED',
          message: 'Failed to set default payment method',
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 500 }
    );
  }
}
