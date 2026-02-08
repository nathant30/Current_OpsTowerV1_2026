import { logger } from '@/lib/security/productionLogger';
/**
 * Maya API Client for Payment Integration
 *
 * Handles all communication with Maya API for checkout payments
 * Includes authentication, checkout creation, status queries, refunds, voids, and webhook verification
 *
 * @module lib/payments/maya/client
 */

import * as crypto from 'crypto';
import {
  MayaCheckoutRequest,
  MayaCheckoutResponse,
  MayaPaymentDetails,
  MayaRefundRequest,
  MayaRefundResponse,
  MayaVoidRequest,
  MayaVoidResponse,
  MayaWebhookPayload,
  MayaConfig,
  MayaAPIError,
  MayaPaymentRequest,
  MayaPaymentResponse,
} from './types';

/**
 * Maya API Client
 * Manages HTTP requests to Maya API with retry logic and error handling
 */
export class MayaClient {
  private config: MayaConfig;

  constructor(config?: Partial<MayaConfig>) {
    // Load configuration from environment
    this.config = {
      publicKey: config?.publicKey || process.env.MAYA_PUBLIC_KEY || process.env.PAYMAYA_PUBLIC_KEY || '',
      secretKey: config?.secretKey || process.env.MAYA_SECRET_KEY || process.env.PAYMAYA_SECRET_KEY || '',
      webhookSecret: config?.webhookSecret || process.env.MAYA_WEBHOOK_SECRET || process.env.PAYMAYA_WEBHOOK_SECRET || '',
      baseUrl:
        config?.baseUrl ||
        (process.env.MAYA_SANDBOX_MODE === 'true'
          ? 'https://pg-sandbox.paymaya.com'
          : process.env.MAYA_BASE_URL || 'https://pg.paymaya.com'),
      sandboxMode: config?.sandboxMode ?? process.env.MAYA_SANDBOX_MODE === 'true',
      maxRetries: config?.maxRetries || 3,
      retryDelayMs: config?.retryDelayMs || 1000,
      requestTimeoutMs: config?.requestTimeoutMs || 30000,
    };

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate client configuration
   * Throws error if required fields are missing
   */
  private validateConfig(): void {
    if (!this.config.publicKey) {
      throw new Error(
        'Maya public key is required. Set MAYA_PUBLIC_KEY environment variable.'
      );
    }

    if (!this.config.secretKey) {
      throw new Error(
        'Maya secret key is required. Set MAYA_SECRET_KEY environment variable.'
      );
    }

    if (!this.config.webhookSecret) {
      logger.warn(
        'Maya webhook secret is not set. Webhook signature verification will not work. Set MAYA_WEBHOOK_SECRET environment variable.'
      );
    }

    if (!this.config.baseUrl) {
      throw new Error('Maya base URL is required.');
    }
  }

  /**
   * Get Basic Authentication header
   * Maya uses Basic Auth with public key as username for checkout creation
   * and secret key as username for other operations
   *
   * @param useSecretKey - Whether to use secret key (true) or public key (false)
   * @returns Authorization header value
   */
  private getAuthHeader(useSecretKey: boolean = false): string {
    // Choose key based on operation
    const key = useSecretKey ? this.config.secretKey : this.config.publicKey;

    // Basic Auth: base64(key:)
    // Password is left blank, only key is used as username
    const credentials = `${key}:`;
    const base64Credentials = Buffer.from(credentials).toString('base64');

    return `Basic ${base64Credentials}`;
  }

  /**
   * Create a new Maya checkout session
   *
   * @param request - Payment request details
   * @returns Checkout response with redirect URL
   * @throws MayaAPIError if checkout creation fails
   */
  async createCheckout(request: MayaPaymentRequest): Promise<MayaPaymentResponse> {
    // Build Maya API request
    const checkoutRequest: MayaCheckoutRequest = {
      totalAmount: {
        value: request.amount.toFixed(2),
        currency: request.currency || 'PHP',
      },
      buyer: {
        firstName: request.customerName.split(' ')[0] || '',
        lastName: request.customerName.split(' ').slice(1).join(' ') || '',
        contact: {
          email: request.customerEmail,
          phone: request.customerPhone,
        },
      },
      items: [
        {
          name: request.description,
          quantity: 1,
          description: request.description,
          amount: {
            value: request.amount.toFixed(2),
            currency: request.currency || 'PHP',
          },
          totalAmount: {
            value: request.amount.toFixed(2),
            currency: request.currency || 'PHP',
          },
        },
      ],
      redirectUrl: {
        success: request.successUrl,
        failure: request.failureUrl,
        cancel: request.cancelUrl || request.failureUrl,
      },
      requestReferenceNumber: `TXN-MAYA-${Date.now()}-${request.userId.slice(0, 8)}`,
      metadata: request.metadata as Record<string, string | number | boolean>,
    };

    try {
      // Make API request with retry (use public key for checkout creation)
      const response = await this.makeRequest<MayaCheckoutResponse>(
        '/checkout/v1/checkouts',
        'POST',
        checkoutRequest,
        false // Use public key
      );

      // Calculate expiry time (15 minutes for Maya)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      // Return formatted response
      return {
        transactionId: checkoutRequest.requestReferenceNumber,
        referenceNumber: response.checkoutId,
        checkoutId: response.checkoutId,
        amount: request.amount,
        currency: request.currency || 'PHP',
        status: 'pending',
        redirectUrl: response.redirectUrl,
        expiresAt,
        createdAt: new Date(),
      };
    } catch (error) {
      if (error instanceof MayaAPIError) {
        throw error;
      }

      throw new MayaAPIError(
        `Failed to create checkout: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_CHECKOUT_FAILED',
        undefined
      );
    }
  }

  /**
   * Query payment status from Maya
   *
   * @param paymentId - Maya payment ID
   * @returns Payment details
   * @throws MayaAPIError if query fails
   */
  async getPaymentStatus(paymentId: string): Promise<MayaPaymentDetails> {
    try {
      const response = await this.makeRequest<MayaPaymentDetails>(
        `/payments/v1/payments/${paymentId}`,
        'GET',
        undefined,
        true // Use secret key for queries
      );

      return response;
    } catch (error) {
      if (error instanceof MayaAPIError) {
        throw error;
      }

      throw new MayaAPIError(
        `Failed to query payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUERY_STATUS_FAILED'
      );
    }
  }

  /**
   * Process a refund
   *
   * @param paymentId - Maya payment ID to refund
   * @param request - Refund request details
   * @returns Refund response
   * @throws MayaAPIError if refund fails
   */
  async processRefund(
    paymentId: string,
    request: MayaRefundRequest
  ): Promise<MayaRefundResponse> {
    try {
      const response = await this.makeRequest<MayaRefundResponse>(
        `/payments/v1/payments/${paymentId}/refunds`,
        'POST',
        request,
        true // Use secret key for refunds
      );

      return response;
    } catch (error) {
      if (error instanceof MayaAPIError) {
        throw error;
      }

      throw new MayaAPIError(
        `Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REFUND_FAILED'
      );
    }
  }

  /**
   * Void a payment (cancel before completion)
   *
   * @param paymentId - Maya payment ID to void
   * @param request - Void request details
   * @returns Void response
   * @throws MayaAPIError if void fails
   */
  async voidPayment(
    paymentId: string,
    request?: MayaVoidRequest
  ): Promise<MayaVoidResponse> {
    try {
      const response = await this.makeRequest<MayaVoidResponse>(
        `/payments/v1/payments/${paymentId}/voids`,
        'POST',
        request,
        true // Use secret key for voids
      );

      return response;
    } catch (error) {
      if (error instanceof MayaAPIError) {
        throw error;
      }

      throw new MayaAPIError(
        `Failed to void payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VOID_FAILED'
      );
    }
  }

  /**
   * Verify webhook signature
   *
   * Maya sends webhooks with a signature header for security
   * We must verify the signature to ensure the webhook is authentic
   *
   * @param payload - Webhook payload
   * @returns true if signature is valid
   */
  verifyWebhookSignature(payload: MayaWebhookPayload): boolean {
    try {
      if (!this.config.webhookSecret) {
        logger.error('Maya webhook secret is not configured');
        return false;
      }

      const signature = payload.headers['x-maya-signature'];

      if (!signature) {
        logger.error('Missing webhook signature header');
        return false;
      }

      // Generate expected signature using HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload.rawBody)
        .digest('hex');

      // Compare signatures (constant-time comparison to prevent timing attacks)
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Make HTTP request to Maya API with retry logic
   *
   * @param endpoint - API endpoint (e.g., '/checkout/v1/checkouts')
   * @param method - HTTP method
   * @param data - Request payload
   * @param useSecretKey - Whether to use secret key (true) or public key (false)
   * @param retryCount - Current retry attempt
   * @returns API response
   * @throws MayaAPIError if request fails after retries
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: Record<string, unknown>,
    useSecretKey: boolean = false,
    retryCount = 0
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: this.getAuthHeader(useSecretKey),
      };

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      // Add body for POST/PUT requests
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      clearTimeout(timeout);

      // Parse response body
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new MayaAPIError(
          responseData.message || responseData.errorMessage || `HTTP ${response.status}: ${response.statusText}`,
          responseData.code || responseData.errorCode || 'HTTP_ERROR',
          response.status,
          responseData.id
        );
      }

      return responseData as T;
    } catch (error) {
      // Retry on network errors
      if (
        retryCount < (this.config.maxRetries || 3) &&
        (error instanceof TypeError || // Network error
          (error instanceof MayaAPIError && error.statusCode && error.statusCode >= 500))
      ) {
        logger.warn(
          `Maya API request failed (attempt ${retryCount + 1}/${this.config.maxRetries}), retrying...`
        );

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, (this.config.retryDelayMs || 1000) * Math.pow(2, retryCount))
        );

        return this.makeRequest<T>(endpoint, method, data, useSecretKey, retryCount + 1);
      }

      // No more retries, throw error
      if (error instanceof MayaAPIError) {
        throw error;
      }

      throw new MayaAPIError(
        `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_FAILED'
      );
    }
  }

  /**
   * Test connection to Maya API
   * Useful for health checks and configuration validation
   *
   * @returns true if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to query a non-existent payment (should return error but prove connection works)
      await this.getPaymentStatus('TEST-CONNECTION');
      return true;
    } catch (error) {
      // If we get a payment not found error, connection is working
      if (error instanceof MayaAPIError && error.code === 'PY0004') {
        return true;
      }
      return false;
    }
  }

  /**
   * Get current configuration
   * Useful for debugging
   *
   * @returns Configuration (with secrets redacted)
   */
  getConfig(): Partial<MayaConfig> {
    return {
      baseUrl: this.config.baseUrl,
      sandboxMode: this.config.sandboxMode,
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      requestTimeoutMs: this.config.requestTimeoutMs,
      // Redact secrets
      publicKey: this.config.publicKey
        ? `${this.config.publicKey.slice(0, 8)}...`
        : undefined,
      secretKey: this.config.secretKey
        ? `${this.config.secretKey.slice(0, 8)}...`
        : undefined,
      webhookSecret: this.config.webhookSecret ? '***REDACTED***' : undefined,
    };
  }
}

/**
 * Default Maya client instance
 * Configured from environment variables
 */
let defaultClient: MayaClient | null = null;

/**
 * Get default Maya client instance
 * Creates a singleton instance configured from environment
 *
 * @returns Default Maya client
 */
export function getMayaClient(): MayaClient {
  if (!defaultClient) {
    defaultClient = new MayaClient();
  }
  return defaultClient;
}

/**
 * Create a new Maya client with custom configuration
 *
 * @param config - Custom configuration
 * @returns New Maya client instance
 */
export function createMayaClient(config: Partial<MayaConfig>): MayaClient {
  return new MayaClient(config);
}

export default MayaClient;
