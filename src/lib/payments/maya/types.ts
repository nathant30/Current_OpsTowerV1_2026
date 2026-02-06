/**
 * Maya (PayMaya) Payment Integration - TypeScript Types
 *
 * Type definitions for Maya API integration
 * Based on Maya API documentation: https://developers.maya.ph/
 *
 * @module lib/payments/maya/types
 */

// ===================================================================
// MAYA API REQUEST/RESPONSE TYPES
// ===================================================================

/**
 * Maya Checkout Request
 * Used to create a new checkout session
 */
export interface MayaCheckoutRequest {
  // Total amount
  totalAmount: {
    value: string; // Amount as string (e.g., "250.00")
    currency: string; // Always 'PHP' for Philippines
  };

  // Buyer information
  buyer?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    contact?: {
      phone?: string;
      email?: string;
    };
  };

  // Items (optional but recommended)
  items?: Array<{
    name: string;
    quantity: number;
    code?: string;
    description?: string;
    amount: {
      value: string;
      currency?: string;
    };
    totalAmount: {
      value: string;
      currency?: string;
    };
  }>;

  // Redirect URLs
  redirectUrl: {
    success: string; // Success URL
    failure: string; // Failure URL
    cancel: string; // Cancel URL
  };

  // Request reference number (merchant's transaction ID)
  requestReferenceNumber: string;

  // Metadata (optional)
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Maya Checkout Response
 * Returned after creating a checkout session
 */
export interface MayaCheckoutResponse {
  // Checkout identifiers
  checkoutId: string; // Maya checkout ID
  redirectUrl: string; // URL to redirect customer to Maya checkout page

  // Status
  status: MayaPaymentStatus;

  // Timestamps
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  expiresAt?: string; // ISO timestamp (15 minutes from creation)
}

/**
 * Maya Payment Status
 * Possible payment statuses from Maya
 */
export enum MayaPaymentStatus {
  // Checkout created, awaiting payment
  PENDING_PAYMENT = 'PENDING_PAYMENT',

  // Payment is being processed
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',

  // Payment completed successfully
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_PAID = 'PAYMENT_PAID', // Alias for PAYMENT_SUCCESS

  // Payment failed
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_DECLINED = 'PAYMENT_DECLINED', // Card declined

  // Payment expired (15 minute timeout)
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',

  // Payment cancelled by user
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',

  // Voided payment
  VOIDED = 'VOIDED',

  // Refunded payment
  REFUNDED = 'REFUNDED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
}

/**
 * Map Maya status to our internal status
 */
export const MAYA_TO_INTERNAL_STATUS: Record<MayaPaymentStatus, string> = {
  [MayaPaymentStatus.PENDING_PAYMENT]: 'pending',
  [MayaPaymentStatus.PAYMENT_PROCESSING]: 'processing',
  [MayaPaymentStatus.PAYMENT_SUCCESS]: 'completed',
  [MayaPaymentStatus.PAYMENT_PAID]: 'completed',
  [MayaPaymentStatus.PAYMENT_FAILED]: 'failed',
  [MayaPaymentStatus.PAYMENT_DECLINED]: 'failed',
  [MayaPaymentStatus.PAYMENT_EXPIRED]: 'expired',
  [MayaPaymentStatus.PAYMENT_CANCELLED]: 'cancelled',
  [MayaPaymentStatus.VOIDED]: 'cancelled',
  [MayaPaymentStatus.REFUNDED]: 'refunded',
  [MayaPaymentStatus.REFUND_REQUESTED]: 'refunded',
};

/**
 * Maya Payment Details (full payment object)
 * Retrieved when querying payment status
 */
export interface MayaPaymentDetails {
  // Identifiers
  id: string; // Maya payment ID
  checkoutId?: string; // Checkout session ID
  requestReferenceNumber: string; // Our internal transaction ID

  // Status
  status: MayaPaymentStatus;
  statusReason?: string;

  // Amount
  totalAmount: {
    value: string;
    currency: string;
  };

  // Payment info
  paymentAt?: string; // ISO timestamp of payment completion
  receiptNumber?: string; // Maya receipt number

  // Buyer details
  buyer?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    contact?: {
      phone?: string;
      email?: string;
    };
  };

  // Error details (if failed)
  errorCode?: string;
  errorMessage?: string;

  // Timestamps
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  expiresAt?: string; // ISO timestamp

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Maya Refund Request
 */
export interface MayaRefundRequest {
  // Refund reason
  reason: string;

  // Amount (optional for partial refund)
  totalAmount?: {
    value: string; // Amount as string (e.g., "100.00")
    currency: string; // Always 'PHP'
  };

  // Request reference number
  requestReferenceNumber: string;
}

/**
 * Maya Refund Response
 */
export interface MayaRefundResponse {
  // Refund identifiers
  id: string; // Maya refund ID
  paymentId: string; // Original payment ID
  requestReferenceNumber: string; // Our refund reference

  // Status
  status: 'PENDING' | 'COMPLETED' | 'FAILED';

  // Amount
  totalAmount: {
    value: string;
    currency: string;
  };

  // Timestamps
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;

  // Error details (if failed)
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Maya Void Request
 * Used to void/cancel a pending payment
 */
export interface MayaVoidRequest {
  // Reason for void
  reason?: string;
}

/**
 * Maya Void Response
 */
export interface MayaVoidResponse {
  // Void identifiers
  id: string; // Maya void ID
  paymentId: string; // Original payment ID

  // Status
  status: 'VOIDED' | 'FAILED';

  // Timestamps
  createdAt: string;
  voidedAt?: string;
}

// ===================================================================
// WEBHOOK TYPES
// ===================================================================

/**
 * Maya Webhook Event
 * Received when payment status changes
 */
export interface MayaWebhookEvent {
  // Event identifiers
  id: string; // Webhook event ID

  // Event name
  name: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'PAYMENT_EXPIRED' | 'CHECKOUT_CREATED';

  // Payment data
  data: {
    // Payment identifiers
    id: string; // Maya payment ID
    checkoutId?: string;
    requestReferenceNumber: string;

    // Status
    status: MayaPaymentStatus;

    // Amount
    totalAmount: {
      value: string;
      currency: string;
    };

    // Payment info
    paymentAt?: string;
    receiptNumber?: string;

    // Buyer
    buyer?: {
      firstName?: string;
      lastName?: string;
      contact?: {
        email?: string;
      };
    };

    // Error details
    errorCode?: string;
    errorMessage?: string;

    // Timestamps
    createdAt: string;
    updatedAt?: string;
  };

  // Timestamp
  createdAt: string; // ISO timestamp of webhook event
}

/**
 * Maya Webhook Payload
 * Full webhook request from Maya
 */
export interface MayaWebhookPayload {
  // HTTP headers
  headers: {
    'x-maya-signature'?: string; // Webhook signature
    'content-type'?: string;
    'user-agent'?: string;
  };

  // Request body
  body: MayaWebhookEvent;

  // Raw body (for signature verification)
  rawBody: string;
}

/**
 * Webhook Processing Result
 */
export interface WebhookProcessingResult {
  success: boolean;
  paymentId: string;
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
 * Maya API Error Codes
 */
export enum MayaErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'PY0001',
  INVALID_API_KEY = 'PY0002',

  // Payment errors
  INVALID_AMOUNT = 'PY0003',
  PAYMENT_NOT_FOUND = 'PY0004',
  PAYMENT_EXPIRED = 'PY0005',
  PAYMENT_ALREADY_PAID = 'PY0006',
  INSUFFICIENT_BALANCE = 'PYBY0008',

  // Card errors
  CARD_EXPIRED = 'PY0002',
  CARD_DECLINED = 'PY0007',

  // Refund errors
  REFUND_NOT_ALLOWED = 'PY0010',
  REFUND_AMOUNT_EXCEEDS = 'PY0011',

  // System errors
  INTERNAL_ERROR = 'PY9999',
}

/**
 * Maya API Error
 */
export class MayaAPIError extends Error {
  code: string;
  statusCode?: number;
  paymentId?: string;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    paymentId?: string
  ) {
    super(message);
    this.name = 'MayaAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.paymentId = paymentId;
  }
}

// ===================================================================
// INTERNAL TYPES
// ===================================================================

/**
 * Maya Payment Creation Request (Internal)
 * Used by our application to initiate a payment
 */
export interface MayaPaymentRequest {
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
  cancelUrl?: string; // Optional cancel URL

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Maya Payment Response (Internal)
 * Returned to our application after creating payment
 */
export interface MayaPaymentResponse {
  // Our identifiers
  transactionId: string; // Our internal transaction ID
  referenceNumber: string; // External reference number

  // Maya identifiers
  checkoutId: string; // Maya checkout ID

  // Payment details
  amount: number;
  currency: string;
  status: string; // Our internal status

  // Redirect information
  redirectUrl: string; // URL to redirect customer to Maya checkout

  // Expiry
  expiresAt: Date; // Payment timeout (15 minutes)

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
  checkoutId: string;
  mayaStatus: MayaPaymentStatus;
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
  mayaRefundId?: string; // Maya refund ID
  createdAt: Date;
}

// ===================================================================
// CONFIGURATION TYPES
// ===================================================================

/**
 * Maya Client Configuration
 */
export interface MayaConfig {
  publicKey: string; // Maya public key (pk-xxx)
  secretKey: string; // Maya secret key (sk-xxx)
  webhookSecret: string; // Webhook signature secret
  baseUrl: string; // API base URL
  sandboxMode: boolean; // Sandbox vs production

  // Retry configuration
  maxRetries?: number;
  retryDelayMs?: number;

  // Timeout configuration
  requestTimeoutMs?: number;
}

/**
 * Maya Service Configuration
 */
export interface MayaServiceConfig {
  maya: MayaConfig;
  webhookUrl: string;

  // Feature flags
  enableWebhooks: boolean;

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
