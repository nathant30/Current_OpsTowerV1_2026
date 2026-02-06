/**
 * EBANX API Client for GCash Integration
 *
 * Handles all communication with EBANX API for GCash payments
 * Includes authentication, payment creation, status queries, refunds, and webhook verification
 *
 * @module lib/payments/gcash/client
 */

import crypto from 'crypto';
import {
  EBANXPaymentRequest,
  EBANXPaymentResponse,
  EBANXStatusQueryRequest,
  EBANXStatusQueryResponse,
  EBANXRefundRequest,
  EBANXRefundResponse,
  EBANXWebhookPayload,
  EBANXConfig,
  EBANXAPIError,
  GCashPaymentRequest,
  GCashPaymentResponse,
} from './types';

/**
 * EBANX API Client
 * Manages HTTP requests to EBANX API with retry logic and error handling
 */
export class EBANXClient {
  private config: EBANXConfig;

  constructor(config?: Partial<EBANXConfig>) {
    // Load configuration from environment
    this.config = {
      integrationKey: config?.integrationKey || process.env.EBANX_API_KEY || '',
      apiSecret: config?.apiSecret || process.env.EBANX_API_SECRET,
      webhookSecret: config?.webhookSecret || process.env.EBANX_WEBHOOK_SECRET || '',
      baseUrl:
        config?.baseUrl ||
        (process.env.EBANX_SANDBOX_MODE === 'true'
          ? process.env.EBANX_SANDBOX_BASE_URL || 'https://sandbox.ebanx.com/ws/direct'
          : process.env.EBANX_BASE_URL || 'https://api.ebanx.com/ws/direct'),
      sandboxMode: config?.sandboxMode ?? process.env.EBANX_SANDBOX_MODE === 'true',
      paymentTimeoutMinutes:
        config?.paymentTimeoutMinutes || parseInt(process.env.EBANX_PAYMENT_TIMEOUT_MINUTES || '30', 10),
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
    if (!this.config.integrationKey) {
      throw new Error(
        'EBANX integration key is required. Set EBANX_API_KEY environment variable.'
      );
    }

    if (!this.config.webhookSecret) {
      throw new Error(
        'EBANX webhook secret is required. Set EBANX_WEBHOOK_SECRET environment variable.'
      );
    }

    if (!this.config.baseUrl) {
      throw new Error('EBANX base URL is required.');
    }
  }

  /**
   * Create a new GCash payment
   *
   * @param request - Payment request details
   * @returns Payment response with redirect URL
   * @throws EBANXAPIError if payment creation fails
   */
  async createPayment(request: GCashPaymentRequest): Promise<GCashPaymentResponse> {
    // Build EBANX API request
    const ebanxRequest: EBANXPaymentRequest = {
      integration_key: this.config.integrationKey,
      operation: 'request',
      mode: 'full',
      payment: {
        amount_total: request.amount.toFixed(2),
        currency_code: request.currency || 'PHP',
        merchant_payment_code: `TXN-GCASH-${Date.now()}-${request.userId.slice(0, 8)}`,
        name: request.customerName,
        email: request.customerEmail,
        phone_number: request.customerPhone,
        type: 'gcash',
        redirect_url: request.successUrl,
        cancel_url: request.failureUrl,
      },
    };

    try {
      // Make API request with retry
      const response = await this.makeRequest<EBANXPaymentResponse>(
        '/request',
        ebanxRequest
      );

      // Check response status
      if (response.status === 'ERROR') {
        throw new EBANXAPIError(
          response.error?.message || 'Payment creation failed',
          response.error?.code || 'UNKNOWN',
          undefined,
          response.error?.payment_code
        );
      }

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.config.paymentTimeoutMinutes);

      // Return formatted response
      return {
        transactionId: response.payment.merchant_payment_code,
        referenceNumber: response.payment.order_number || response.payment.hash,
        ebanxHash: response.payment.hash,
        amount: request.amount,
        currency: request.currency || 'PHP',
        status: 'pending',
        redirectUrl: response.payment.gcash.callback_url,
        deepLinkUrl: response.payment.gcash.deep_link_url,
        qrCodeUrl: response.payment.gcash.qr_code_url,
        expiresAt,
        createdAt: new Date(response.payment.created_at),
      };
    } catch (error) {
      if (error instanceof EBANXAPIError) {
        throw error;
      }

      throw new EBANXAPIError(
        `Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_PAYMENT_FAILED',
        undefined
      );
    }
  }

  /**
   * Query payment status from EBANX
   *
   * @param transactionId - Our internal transaction ID or EBANX hash
   * @returns Payment status details
   * @throws EBANXAPIError if query fails
   */
  async getPaymentStatus(transactionId: string): Promise<EBANXStatusQueryResponse> {
    const queryRequest: EBANXStatusQueryRequest = {
      integration_key: this.config.integrationKey,
    };

    // Check if transactionId is EBANX hash or our internal ID
    if (transactionId.startsWith('TXN-GCASH-')) {
      queryRequest.merchant_payment_code = transactionId;
    } else {
      queryRequest.hash = transactionId;
    }

    try {
      const response = await this.makeRequest<EBANXStatusQueryResponse>(
        '/query',
        queryRequest
      );

      if (response.status === 'ERROR') {
        throw new EBANXAPIError(
          response.error?.message || 'Payment status query failed',
          response.error?.code || 'UNKNOWN'
        );
      }

      return response;
    } catch (error) {
      if (error instanceof EBANXAPIError) {
        throw error;
      }

      throw new EBANXAPIError(
        `Failed to query payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUERY_STATUS_FAILED'
      );
    }
  }

  /**
   * Process a refund
   *
   * @param ebanxHash - EBANX payment hash to refund
   * @param amount - Optional: Partial refund amount (default: full refund)
   * @param description - Refund reason
   * @returns Refund response
   * @throws EBANXAPIError if refund fails
   */
  async processRefund(
    ebanxHash: string,
    description: string,
    amount?: number
  ): Promise<EBANXRefundResponse> {
    const refundRequest: EBANXRefundRequest = {
      integration_key: this.config.integrationKey,
      operation: 'request',
      hash: ebanxHash,
      description,
    };

    if (amount !== undefined) {
      refundRequest.amount = amount.toFixed(2);
    }

    try {
      const response = await this.makeRequest<EBANXRefundResponse>(
        '/refund',
        refundRequest
      );

      if (response.status === 'ERROR') {
        throw new EBANXAPIError(
          response.error?.message || 'Refund processing failed',
          response.error?.code || 'UNKNOWN'
        );
      }

      return response;
    } catch (error) {
      if (error instanceof EBANXAPIError) {
        throw error;
      }

      throw new EBANXAPIError(
        `Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REFUND_FAILED'
      );
    }
  }

  /**
   * Verify webhook signature
   *
   * EBANX sends webhooks with a signature header for security
   * We must verify the signature to ensure the webhook is authentic
   *
   * @param payload - Webhook payload
   * @returns true if signature is valid
   */
  verifyWebhookSignature(payload: EBANXWebhookPayload): boolean {
    try {
      const signature = payload.headers['x-ebanx-signature'];

      if (!signature) {
        console.error('Missing webhook signature header');
        return false;
      }

      // Generate expected signature
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
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Make HTTP request to EBANX API with retry logic
   *
   * @param endpoint - API endpoint (e.g., '/request', '/query')
   * @param data - Request payload
   * @param retryCount - Current retry attempt
   * @returns API response
   * @throws EBANXAPIError if request fails after retries
   */
  private async makeRequest<T>(
    endpoint: string,
    data: Record<string, unknown>,
    retryCount = 0
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new EBANXAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const responseData = await response.json();
      return responseData as T;
    } catch (error) {
      // Retry on network errors
      if (
        retryCount < (this.config.maxRetries || 3) &&
        (error instanceof TypeError || // Network error
          error instanceof EBANXAPIError && error.code === 'HTTP_ERROR')
      ) {
        console.warn(
          `EBANX API request failed (attempt ${retryCount + 1}/${this.config.maxRetries}), retrying...`
        );

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, (this.config.retryDelayMs || 1000) * Math.pow(2, retryCount))
        );

        return this.makeRequest<T>(endpoint, data, retryCount + 1);
      }

      // No more retries, throw error
      if (error instanceof EBANXAPIError) {
        throw error;
      }

      throw new EBANXAPIError(
        `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_FAILED'
      );
    }
  }

  /**
   * Test connection to EBANX API
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
      if (error instanceof EBANXAPIError && error.code === 'BP-DR-5') {
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
  getConfig(): Partial<EBANXConfig> {
    return {
      baseUrl: this.config.baseUrl,
      sandboxMode: this.config.sandboxMode,
      paymentTimeoutMinutes: this.config.paymentTimeoutMinutes,
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      requestTimeoutMs: this.config.requestTimeoutMs,
      // Redact secrets
      integrationKey: this.config.integrationKey
        ? `${this.config.integrationKey.slice(0, 8)}...`
        : undefined,
      webhookSecret: this.config.webhookSecret ? '***REDACTED***' : undefined,
    };
  }
}

/**
 * Default EBANX client instance
 * Configured from environment variables
 */
let defaultClient: EBANXClient | null = null;

/**
 * Get default EBANX client instance
 * Creates a singleton instance configured from environment
 *
 * @returns Default EBANX client
 */
export function getEBANXClient(): EBANXClient {
  if (!defaultClient) {
    defaultClient = new EBANXClient();
  }
  return defaultClient;
}

/**
 * Create a new EBANX client with custom configuration
 *
 * @param config - Custom configuration
 * @returns New EBANX client instance
 */
export function createEBANXClient(config: Partial<EBANXConfig>): EBANXClient {
  return new EBANXClient(config);
}

export default EBANXClient;
