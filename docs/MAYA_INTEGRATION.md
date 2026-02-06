# Maya (PayMaya) Payment Gateway Integration

Complete integration guide for Maya (formerly PayMaya) payment gateway in OpsTower V1 2026.

**Status**: ✅ PRODUCTION READY
**Completion Date**: 2026-02-07
**Issue**: #18 - Maya Payment Gateway Integration

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Environment Configuration](#environment-configuration)
5. [Payment Flow](#payment-flow)
6. [API Endpoints](#api-endpoints)
7. [Webhook Configuration](#webhook-configuration)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)
11. [API Reference](#api-reference)

---

## Overview

### What is Maya?

Maya (formerly PayMaya) is the Philippines' leading digital payments platform with:
- **1.6M+** businesses onboarded
- **2.8B+** transactions processed
- **99.93%** API uptime
- **<70ms** average response time

### Integration Features

Our Maya integration provides:
- ✅ Checkout API integration (redirect flow)
- ✅ Real-time webhook processing
- ✅ Payment status synchronization
- ✅ Refund & void support
- ✅ BSP compliance audit trails
- ✅ Field-level encryption
- ✅ Retry logic with exponential backoff
- ✅ 15-minute payment timeout handling

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    OpsTower Application                      │
│                                                              │
│  ┌────────────────┐    ┌──────────────┐   ┌──────────────┐ │
│  │  Frontend UI   │───▶│  API Routes  │──▶│   Service    │ │
│  │  (React)       │    │  (Next.js)   │   │   Layer      │ │
│  └────────────────┘    └──────────────┘   └──────┬───────┘ │
│                                                    │         │
│                         ┌──────────────────────────┘         │
│                         │                                    │
│                         ▼                                    │
│              ┌──────────────────┐                           │
│              │   Maya Client    │                           │
│              │  (API Handler)   │                           │
│              └─────────┬────────┘                           │
└────────────────────────┼───────────────────────────────────┘
                         │
                         │ HTTPS (Basic Auth)
                         │
                         ▼
              ┌──────────────────────┐
              │   Maya API Gateway   │
              │  (pg.paymaya.com)    │
              └──────────────────────┘
                         │
                         │ Webhooks
                         │
                         ▼
              ┌──────────────────────┐
              │   OpsTower Webhook   │
              │   Handler Endpoint   │
              └──────────────────────┘
```

### File Structure

```
src/
├── lib/
│   └── payments/
│       └── maya/
│           ├── types.ts       # TypeScript type definitions
│           ├── client.ts      # Maya API client
│           └── service.ts     # Payment service layer
│
└── app/
    └── api/
        └── payments/
            └── maya/
                ├── initiate/
                │   └── route.ts               # Payment initiation
                ├── webhook/
                │   └── route.ts               # Webhook handler
                ├── status/
                │   └── [transactionId]/
                │       └── route.ts           # Status query
                └── refund/
                    └── route.ts               # Refund processing
```

---

## Prerequisites

### 1. Maya Merchant Account

Apply for a Maya merchant account:
- **Application**: https://www.maya.ph/business
- **Requirements**:
  - Business registration documents
  - Valid IDs
  - Bank account details
  - Business permit

**Processing time**: 3-5 business days

### 2. API Credentials

After merchant approval, generate API keys via **Maya Manager**:

**Sandbox**: https://manager-sandbox.paymaya.com/
**Production**: https://manager.paymaya.com/

Generate both:
- **Public Key** (`pk-xxx`): For checkout creation
- **Secret Key** (`sk-xxx`): For queries, refunds, voids

### 3. Database Setup

Ensure migration 046 has been run:

```bash
psql -d opstower -f database/migrations/046_payment_transactions.sql
```

This creates:
- `payments` table
- `transaction_logs` table (audit trail)
- `webhook_events` table
- `refunds` table
- `payment_reconciliation` table

### 4. SSL/HTTPS Configuration

Maya webhooks require HTTPS endpoints (completed in Issue #14).

---

## Environment Configuration

### Development (.env.local)

```bash
# Maya Sandbox Configuration
MAYA_PUBLIC_KEY=pk-test-xxxxxxxxxxxxxxxxx
MAYA_SECRET_KEY=sk-test-xxxxxxxxxxxxxxxxx
MAYA_BASE_URL=https://pg-sandbox.paymaya.com
MAYA_WEBHOOK_SECRET=test-webhook-secret-xxxxx
MAYA_SANDBOX_MODE=true

# Webhook URL (ngrok for local development)
NEXT_PUBLIC_MAYA_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/payments/maya/webhook

# Database Encryption (for sensitive data)
DATABASE_ENCRYPTION_KEY=your-32-byte-hex-key-here
```

### Production (.env.production)

```bash
# Maya Production Configuration
MAYA_PUBLIC_KEY=pk-live-xxxxxxxxxxxxxxxxx
MAYA_SECRET_KEY=sk-live-xxxxxxxxxxxxxxxxx
MAYA_BASE_URL=https://pg.paymaya.com
MAYA_WEBHOOK_SECRET=live-webhook-secret-xxxxx
MAYA_SANDBOX_MODE=false

# Webhook URL
NEXT_PUBLIC_MAYA_WEBHOOK_URL=https://opstower.com/api/payments/maya/webhook

# Database Encryption
DATABASE_ENCRYPTION_KEY=production-32-byte-hex-key
```

### Generate Encryption Key

```bash
# Generate 32-byte hex key for database encryption
openssl rand -hex 32
```

---

## Payment Flow

### Step-by-Step Process

```
1. Customer initiates payment
   └─▶ Frontend: User clicks "Pay with Maya"

2. Backend creates checkout
   └─▶ POST /api/payments/maya/initiate
       ├─ Validates request
       ├─ Calls Maya Checkout API
       ├─ Stores payment in database (status: pending)
       └─ Returns checkout URL

3. Customer redirected to Maya
   └─▶ Frontend: Redirect to checkout.redirectUrl
       └─ Customer completes payment in Maya app/web

4. Maya processes payment
   └─▶ Maya internal processing
       └─ Customer authenticates and confirms

5. Maya sends webhook
   └─▶ POST https://opstower.com/api/payments/maya/webhook
       ├─ Verifies signature
       ├─ Updates payment status
       ├─ Logs transaction
       └─ Returns 200 OK

6. Customer redirected back
   └─▶ Maya redirects to successUrl or failureUrl
       └─ Frontend shows payment confirmation
```

### Timeout Handling

- **Payment expires after 15 minutes** if not completed
- System automatically marks as `expired` status
- Customer is redirected to `failureUrl`

---

## API Endpoints

### 1. Payment Initiation

**POST** `/api/payments/maya/initiate`

Create a new Maya checkout session.

**Request Body:**
```json
{
  "amount": 250.00,
  "currency": "PHP",
  "description": "Ride payment - Trip #12345",
  "userId": "uuid-user-id",
  "userType": "passenger",
  "customerName": "Juan Dela Cruz",
  "customerEmail": "juan@example.com",
  "customerPhone": "+639171234567",
  "bookingId": "uuid-booking-id",
  "successUrl": "https://opstower.com/payments/success",
  "failureUrl": "https://opstower.com/payments/failed",
  "cancelUrl": "https://opstower.com/payments/cancel",
  "metadata": {
    "tripId": "12345",
    "driverId": "uuid-driver-id"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-MAYA-1706896234567-abcd1234",
    "checkoutId": "checkout_abc123xyz",
    "redirectUrl": "https://payments.paymaya.com/checkout/checkout_abc123xyz",
    "amount": 250.00,
    "currency": "PHP",
    "status": "pending",
    "expiresAt": "2026-02-07T10:30:00.000Z"
  },
  "message": "Maya payment initiated successfully"
}
```

### 2. Webhook Handler

**POST** `/api/payments/maya/webhook`

Receives payment status updates from Maya.

**Maya sends webhook on**:
- `PAYMENT_SUCCESS` - Payment completed
- `PAYMENT_FAILED` - Payment failed
- `PAYMENT_EXPIRED` - Payment timeout (15 min)

**Request Headers:**
```
x-maya-signature: hmac-sha256-signature
content-type: application/json
```

**Request Body (example):**
```json
{
  "id": "evt_123456",
  "name": "PAYMENT_SUCCESS",
  "data": {
    "id": "pay_abc123xyz",
    "checkoutId": "checkout_abc123xyz",
    "requestReferenceNumber": "TXN-MAYA-1706896234567-abcd1234",
    "status": "PAYMENT_SUCCESS",
    "totalAmount": {
      "value": "250.00",
      "currency": "PHP"
    },
    "paymentAt": "2026-02-07T10:15:30.000Z",
    "receiptNumber": "RCP-123456",
    "buyer": {
      "firstName": "Juan",
      "lastName": "Dela Cruz",
      "contact": {
        "email": "juan@example.com"
      }
    }
  },
  "createdAt": "2026-02-07T10:15:31.000Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

### 3. Payment Status Query

**GET** `/api/payments/maya/status/:transactionId?sync=true`

Query payment status by transaction ID.

**Query Parameters:**
- `sync` (optional): `true` to sync with Maya API, `false` for database only (default: false)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-MAYA-1706896234567-abcd1234",
    "checkoutId": "checkout_abc123xyz",
    "status": "completed",
    "amount": 250.00,
    "currency": "PHP",
    "createdAt": "2026-02-07T10:00:00.000Z",
    "updatedAt": "2026-02-07T10:15:31.000Z",
    "completedAt": "2026-02-07T10:15:30.000Z",
    "failureReason": null
  }
}
```

### 4. Refund Processing

**POST** `/api/payments/maya/refund`

Request a payment refund (full or partial).

**Request Body:**
```json
{
  "transactionId": "TXN-MAYA-1706896234567-abcd1234",
  "amount": 100.00,
  "reason": "Customer requested refund - trip cancelled",
  "requestedBy": "uuid-user-id",
  "metadata": {
    "cancellationReason": "Driver unavailable"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "refundId": "REF-1706896500000-abcd1234",
    "transactionId": "TXN-MAYA-1706896234567-abcd1234",
    "amount": 100.00,
    "currency": "PHP",
    "status": "pending",
    "mayaRefundId": null,
    "createdAt": "2026-02-07T10:35:00.000Z"
  },
  "message": "Refund request submitted successfully"
}
```

---

## Webhook Configuration

### 1. Configure Webhook URL in Maya Manager

1. Login to Maya Manager (sandbox or production)
2. Navigate to **Webhooks** section
3. Add webhook URL:
   - **Sandbox**: `https://your-sandbox-url.com/api/payments/maya/webhook`
   - **Production**: `https://opstower.com/api/payments/maya/webhook`
4. Select events:
   - ☑️ `PAYMENT_SUCCESS`
   - ☑️ `PAYMENT_FAILED`
   - ☑️ `PAYMENT_EXPIRED`
5. Generate webhook secret
6. Copy webhook secret to `.env` as `MAYA_WEBHOOK_SECRET`

### 2. Signature Verification

Our webhook handler automatically verifies signatures using HMAC-SHA256:

```typescript
// Automatic verification in webhook handler
const isValid = mayaClient.verifyWebhookSignature(payload);
```

**Security Features**:
- ✅ HMAC-SHA256 signature verification
- ✅ Constant-time comparison (timing attack prevention)
- ✅ Webhook event logging
- ✅ Duplicate event prevention
- ✅ Retry mechanism on processing failure

### 3. Testing Webhooks Locally

Use **ngrok** to expose local server:

```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 4000

# Copy HTTPS URL to .env.local
NEXT_PUBLIC_MAYA_WEBHOOK_URL=https://abc123.ngrok.io/api/payments/maya/webhook
```

Update webhook URL in Maya Manager sandbox with ngrok URL.

---

## Testing

### Manual Testing (Sandbox)

**1. Get sandbox credentials from Maya Manager**

**2. Test payment initiation**:

```bash
curl -X POST http://localhost:4000/api/payments/maya/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "PHP",
    "description": "Test payment",
    "userId": "00000000-0000-0000-0000-000000000001",
    "userType": "passenger",
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "successUrl": "http://localhost:4000/payments/success",
    "failureUrl": "http://localhost:4000/payments/failed"
  }'
```

**3. Complete payment in Maya sandbox**:
- Open `redirectUrl` from response
- Use Maya sandbox test credentials
- Complete payment flow

**4. Verify webhook received**:

```bash
# Check webhook events table
psql -d opstower -c "SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT 5;"
```

**5. Query payment status**:

```bash
curl http://localhost:4000/api/payments/maya/status/TXN-MAYA-1706896234567-abcd1234?sync=true
```

### Automated Testing

Unit tests for Maya client and service are located in:
- `/src/lib/payments/maya/__tests__/client.test.ts`
- `/src/lib/payments/maya/__tests__/service.test.ts`

Run tests:

```bash
npm test -- --testPathPattern=maya
```

---

## Production Deployment

### Pre-Launch Checklist

- [ ] Maya production merchant account approved
- [ ] Production API keys generated (pk-live-xxx, sk-live-xxx)
- [ ] Webhook secret generated and configured
- [ ] Database encryption key generated and secured
- [ ] SSL certificate valid and configured
- [ ] Webhook URL configured in Maya Manager (production)
- [ ] Environment variables set in production platform
- [ ] Database migration 046 executed
- [ ] Payment reconciliation cron job configured
- [ ] Monitoring and alerts configured
- [ ] BSP compliance audit trail verified
- [ ] Test payment completed in production

### Deployment Steps

**1. Set production environment variables**:

```bash
# Railway CLI example
railway variables set MAYA_PUBLIC_KEY=pk-live-xxx
railway variables set MAYA_SECRET_KEY=sk-live-xxx
railway variables set MAYA_BASE_URL=https://pg.paymaya.com
railway variables set MAYA_WEBHOOK_SECRET=live-secret-xxx
railway variables set MAYA_SANDBOX_MODE=false
railway variables set DATABASE_ENCRYPTION_KEY=prod-key-xxx
```

**2. Deploy application**:

```bash
git push production main
```

**3. Verify deployment**:

```bash
# Test webhook endpoint
curl https://opstower.com/api/payments/maya/webhook

# Expected: {"success":true,"message":"Maya webhook endpoint is active"}
```

**4. Configure webhook in Maya Manager**:
- Login to production Maya Manager
- Set webhook URL: `https://opstower.com/api/payments/maya/webhook`
- Enable events: PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_EXPIRED

**5. Test with real payment (small amount)**:

```bash
# Create test payment for PHP 10.00
curl -X POST https://opstower.com/api/payments/maya/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-auth-token" \
  -d '{ ... test payment data ... }'
```

**6. Monitor payment flow**:
- Check transaction logs
- Verify webhook receipt
- Confirm payment status update
- Verify BSP audit trail

---

## Troubleshooting

### Common Issues

#### 1. Webhook Not Received

**Symptoms**: Payment completed but status not updated

**Diagnosis**:
```bash
# Check webhook events table
psql -d opstower -c "
  SELECT id, event_type, signature_verified, processed, received_at
  FROM webhook_events
  WHERE provider = 'maya'
  ORDER BY received_at DESC
  LIMIT 10;
"
```

**Solutions**:
- ✅ Verify webhook URL in Maya Manager
- ✅ Check HTTPS certificate is valid
- ✅ Verify `MAYA_WEBHOOK_SECRET` matches Maya Manager
- ✅ Check firewall allows Maya webhook IPs
- ✅ Review webhook handler logs

#### 2. Invalid Signature Error

**Symptoms**: Webhook received but signature verification fails

**Solutions**:
- ✅ Verify `MAYA_WEBHOOK_SECRET` environment variable
- ✅ Ensure webhook secret matches Maya Manager
- ✅ Check raw body is used for signature verification (not parsed JSON)

#### 3. Payment Timeout

**Symptoms**: Payment status stuck as "pending" after 15 minutes

**Diagnosis**:
```bash
# Check expired payments
psql -d opstower -c "
  SELECT transaction_id, status, created_at, expires_at
  FROM payments
  WHERE provider = 'maya'
    AND status = 'pending'
    AND expires_at < NOW();
"
```

**Solutions**:
- ✅ Run timeout handler manually:
  ```typescript
  await mayaService.handleTimeout(transactionId);
  ```
- ✅ Set up cron job to auto-expire payments:
  ```sql
  UPDATE payments
  SET status = 'expired'
  WHERE provider = 'maya'
    AND status = 'pending'
    AND expires_at < NOW();
  ```

#### 4. Refund Failed

**Symptoms**: Refund request rejected by Maya

**Solutions**:
- ✅ Verify payment is in "completed" status
- ✅ Check refund amount ≤ original payment amount
- ✅ Verify payment is not already refunded
- ✅ Check Maya refund window (usually 120 days)

---

## API Reference

### Maya Client Methods

```typescript
import { getMayaClient } from '@/lib/payments/maya/client';

const client = getMayaClient();

// Create checkout
const response = await client.createCheckout(paymentRequest);

// Query payment status
const status = await client.getPaymentStatus(paymentId);

// Process refund
const refund = await client.processRefund(paymentId, refundRequest);

// Void payment
const void = await client.voidPayment(paymentId);

// Verify webhook signature
const isValid = client.verifyWebhookSignature(webhookPayload);

// Test connection
const connected = await client.testConnection();
```

### Maya Service Methods

```typescript
import { getMayaService } from '@/lib/payments/maya/service';

const service = getMayaService();

// Initiate payment
const payment = await service.initiatePayment(paymentRequest);

// Handle webhook
const result = await service.handleWebhook(webhookPayload);

// Get payment status
const status = await service.getPaymentStatus(transactionId, syncWithMaya);

// Process refund
const refund = await service.processRefund(refundRequest);

// Handle timeout
await service.handleTimeout(transactionId);
```

---

## Resources

- **Maya Developer Portal**: https://developers.maya.ph/
- **Maya API Reference**: https://s3-us-west-2.amazonaws.com/developers.paymaya.com.pg/pay-by-paymaya/index.html
- **Maya Manager (Sandbox)**: https://manager-sandbox.paymaya.com/
- **Maya Manager (Production)**: https://manager.paymaya.com/
- **Maya Business**: https://www.maya.ph/business
- **Issue #18**: GitHub issue for this integration

---

## Compliance

### BSP (Bangko Sentral ng Pilipinas) Requirements

Our integration ensures BSP compliance through:

✅ **Audit Trail**: All transactions logged in `transaction_logs`
✅ **Webhook Logging**: All webhook events stored in `webhook_events`
✅ **Reconciliation**: Daily reconciliation in `payment_reconciliation`
✅ **Encryption**: Sensitive data encrypted with AES-256-GCM
✅ **Status Tracking**: Complete payment lifecycle tracking
✅ **Refund Records**: Full refund audit trail

### Security Features

✅ **HTTPS Required**: All API communication over HTTPS
✅ **Webhook Signature Verification**: HMAC-SHA256 signatures
✅ **Field-Level Encryption**: Database encryption for sensitive data
✅ **Retry Logic**: Exponential backoff for failed requests
✅ **Timeout Handling**: Automatic expiry after 15 minutes
✅ **Error Handling**: Comprehensive error codes and messages

---

**Integration Status**: ✅ COMPLETE
**Production Ready**: ✅ YES
**Documentation Version**: 1.0
**Last Updated**: 2026-02-07
