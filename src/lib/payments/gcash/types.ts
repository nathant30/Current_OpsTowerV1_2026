/**
 * EBANX GCash Payment Integration - TypeScript Types
 *
 * Type definitions for EBANX API integration with GCash
 * Based on EBANX API documentation: https://docs.ebanx.com/docs/payments/guides/accept-payments/api/philippines/gcash/
 *
 * @module lib/payments/gcash/types
 */

// ===================================================================
// EBANX API REQUEST/RESPONSE TYPES
// ===================================================================

/**
 * EBANX Payment Request
 * Used to create a new GCash payment
 */
export interface EBANXPaymentRequest {
  // Integration credentials
  integration_key: string;

  // Operation type
  operation: 'request'; // Always 'request' for payment creation
  mode: 'full'; // Payment mode

  // Payment details
  payment: {
    amount_total: string; // Total amount as string (e.g., "250.00")
    currency_code: string; // Always 'PHP' for Philippines
    merchant_payment_code: string; // Our internal transaction ID
    name: string; // Customer name
    email: string; // Customer email
    phone_number?: string; // Optional phone number

    // Payment method
    type: 'gcash'; // Always 'gcash' for GCash payments

    // Redirect URLs
    redirect_url: string; // Success URL
    cancel_url?: string; // Cancel/Failure URL
  };

  // Device information (optional)
  device?: {
    fingerprint?: string;
    user_agent?: string;
    ip_address?: string;
  };
}

/**
 * EBANX Payment Response
 * Returned after creating a payment
 */
export interface EBANXPaymentResponse {
  // Response status
  status: 'SUCCESS' | 'ERROR';

  // Payment data
  payment: {
    hash: string; // EBANX payment hash (unique identifier)
    merchant_payment_code: string; // Our internal transaction ID
    order_number: string | null; // EBANX order number
    status: EBANXPaymentStatus; // Payment status
    status_date: string | null; // ISO timestamp

    // Payment method details
    gcash: {
      callback_url: string; // URL to redirect customer to GCash app
      deep_link_url?: string; // Mobile deep link (optional)
      qr_code_url?: string; // QR code image URL (optional)
    };

    // Amount
    amount_total: string;
    currency_code: string;

    // Customer info
    customer: {
      name: string;
      email: string;
      phone_number?: string;
    };

    // Timestamps
    created_at: string; // ISO timestamp
    updated_at?: string; // ISO timestamp
  };

  // Error details (only if status is ERROR)
  error?: {
    code: string;
    message: string;
    payment_code?: string;
  };
}

/**
 * EBANX Payment Status
 * Possible payment statuses from EBANX
 */
export enum EBANXPaymentStatus {
  OPEN = 'OP', // Payment created, awaiting customer action
  PENDING = 'PE', // Payment initiated, processing
  CONFIRMED = 'CO', // Payment successful
  CANCELLED = 'CA', // Payment cancelled by customer
  REFUNDED = 'RF', // Payment refunded
  EXPIRED = 'EX', // Payment timeout (30 minutes)
  FAILED = 'FA', // Payment failed
}

/**
 * Map EBANX status to our internal status
 */
export const EBANX_TO_INTERNAL_STATUS: Record<EBANXPaymentStatus, string> = {
  [EBANXPaymentStatus.OPEN]: 'pending',
  [EBANXPaymentStatus.PENDING]: 'processing',
  [EBANXPaymentStatus.CONFIRMED]: 'completed',
  [EBANXPaymentStatus.CANCELLED]: 'cancelled',
  [EBANXPaymentStatus.REFUNDED]: 'refunded',
  [EBANXPaymentStatus.EXPIRED]: 'expired',
  [EBANXPaymentStatus.FAILED]: 'failed',
};

/**
 * EBANX Payment Status Query Request
 */
export interface EBANXStatusQueryRequest {
  integration_key: string;
  hash?: string; // EBANX payment hash
  merchant_payment_code?: string; // Our internal transaction ID
}

/**
 * EBANX Payment Status Query Response
 */
export interface EBANXStatusQueryResponse {
  status: 'SUCCESS' | 'ERROR';
  payment: {
    hash: string;
    merchant_payment_code: string;
    status: EBANXPaymentStatus;
    status_date: string | null;
    amount_total: string;
    currency_code: string;

    // Additional status details
    customer: {
      name: string;
      email: string;
    };

    created_at: string;
    updated_at?: string;
  };

  error?: {
    code: string;
    message: string;
  };
}

/**
 * EBANX Refund Request
 */
export interface EBANXRefundRequest {
  integration_key: string;
  operation: 'request'; // Always 'request'
  hash: string; // EBANX payment hash to refund
  amount?: string; // Optional: Partial refund amount (default: full refund)
  description: string; // Refund reason
}

/**
 * EBANX Refund Response
 */
export interface EBANXRefundResponse {
  status: 'SUCCESS' | 'ERROR';
  refund?: {
    id: string; // EBANX refund ID
    payment_hash: string; // Original payment hash
    amount: string;
    currency_code: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    created_at: string;
  };

  error?: {
    code: string;
    message: string;
  };
}

// ===================================================================
// WEBHOOK TYPES
// ===================================================================

/**
 * EBANX Webhook Event
 * Received when payment status changes
 */
export interface EBANXWebhookEvent {
  // Webhook metadata
  notification_type: 'update' | 'refund'; // Event type
  hash_codes: string[]; // Array of payment hashes that changed

  // Webhook signature (for verification)
  signature?: string;

  // Timestamp
  created_at: string; // ISO timestamp
}

/**
 * EBANX Webhook Payload
 * Full webhook request body
 */
export interface EBANXWebhookPayload {
  // HTTP headers
  headers: {
    'x-ebanx-signature'?: string; // Webhook signature
    'content-type'?: string;
    'user-agent'?: string;
  };

  // Request body
  body: EBANXWebhookEvent;

  // Raw body (for signature verification)
  rawBody: string;
}

/**
 * Webhook Processing Result
 */
export interface WebhookProcessingResult {
  success: boolean;
  paymentHash: string;
  transactionId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: Date;
  error?: string;
}

// ===================================================================
// ERROR TYPES
// ===================================================================

/**
 * EBANX API Error Codes
 */
export enum EBANXErrorCode {
  // Authentication errors
  INVALID_INTEGRATION_KEY = 'BP-DR-1',
  UNAUTHORIZED = 'BP-DR-2',

  // Payment errors
  INVALID_AMOUNT = 'BP-DR-3',
  INVALID_CURRENCY = 'BP-DR-4',
  PAYMENT_NOT_FOUND = 'BP-DR-5',
  PAYMENT_ALREADY_PROCESSED = 'BP-DR-6',

  // Customer errors
  INVALID_CUSTOMER_DATA = 'BP-DR-7',

  // Refund errors
  REFUND_NOT_ALLOWED = 'BP-DR-8',
  REFUND_AMOUNT_EXCEEDS = 'BP-DR-9',

  // System errors
  INTERNAL_ERROR = 'BP-DR-99',
  TIMEOUT = 'BP-DR-100',
}

/**
 * EBANX API Error
 */
export class EBANXAPIError extends Error {
  code: string;
  statusCode?: number;
  paymentCode?: string;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    paymentCode?: string
  ) {
    super(message);
    this.name = 'EBANXAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.paymentCode = paymentCode;
  }
}

// ===================================================================
// INTERNAL TYPES
// ===================================================================

/**
 * GCash Payment Creation Request (Internal)
 * Used by our application to initiate a payment
 */
export interface GCashPaymentRequest {
  // Amount
  amount: number; // In PHP
  currency?: string; // Default: 'PHP'

  // Description
  description: string;

  // Customer details
  userId: string;
  userType: 'passenger' | 'driver' | 'operator';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;

  // Related entity
  bookingId?: string;

  // Redirect URLs
  successUrl: string;
  failureUrl: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * GCash Payment Response (Internal)
 * Returned to our application after creating payment
 */
export interface GCashPaymentResponse {
  // Our identifiers
  transactionId: string; // Our internal transaction ID
  referenceNumber: string; // External reference number

  // EBANX identifiers
  ebanxHash: string; // EBANX payment hash

  // Payment details
  amount: number;
  currency: string;
  status: string; // Our internal status

  // Redirect information
  redirectUrl: string; // URL to redirect customer to GCash
  deepLinkUrl?: string; // Mobile deep link (optional)
  qrCodeUrl?: string; // QR code URL (optional)

  // Expiry
  expiresAt: Date; // Payment timeout (30 minutes)

  // Timestamps
  createdAt: Date;
}

/**
 * Payment Status Query Result
 */
export interface PaymentStatusResult {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  ebanxHash: string;
  ebanxStatus: EBANXPaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

/**
 * Refund Request (Internal)
 */
export interface RefundRequest {
  transactionId: string; // Payment to refund
  amount?: number; // Optional: Partial refund (default: full)
  reason: string; // Refund reason
  requestedBy: string; // User ID who requested refund
  metadata?: Record<string, unknown>;
}

/**
 * Refund Response (Internal)
 */
export interface RefundResponse {
  refundId: string; // Our internal refund ID
  transactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed';
  ebanxRefundId?: string; // EBANX refund ID
  createdAt: Date;
}

// ===================================================================
// CONFIGURATION TYPES
// ===================================================================

/**
 * EBANX Client Configuration
 */
export interface EBANXConfig {
  integrationKey: string;
  apiSecret?: string;
  webhookSecret: string;
  baseUrl: string;
  sandboxMode: boolean;
  paymentTimeoutMinutes: number;

  // Retry configuration
  maxRetries?: number;
  retryDelayMs?: number;

  // Timeout configuration
  requestTimeoutMs?: number;
}

/**
 * GCash Service Configuration
 */
export interface GCashServiceConfig {
  ebanx: EBANXConfig;
  webhookUrl: string;

  // Feature flags
  enableMobileDeepLinks: boolean;
  enableQRCode: boolean;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ===================================================================
// UTILITY TYPES
// ===================================================================

/**
 * Payment Flow Device Type
 */
export type DeviceType = 'mobile' | 'web' | 'desktop';

/**
 * Payment Flow Method
 */
export type PaymentFlowMethod = 'deep_link' | 'qr_code' | 'redirect';

/**
 * Transaction Log Entry
 */
export interface TransactionLogEntry {
  paymentId: string;
  transactionId: string;
  eventType: string;
  previousStatus?: string;
  newStatus?: string;
  description: string;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: string;
  source: 'api' | 'webhook' | 'manual' | 'system' | 'retry';
  sourceIp?: string;
  createdBy?: string;
}
