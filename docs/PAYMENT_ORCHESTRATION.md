# Payment Orchestration System

## Overview

The Payment Orchestration System provides a unified interface for managing payments across multiple gateways (Maya and GCash). It handles intelligent routing, fallback logic, fee calculation, and comprehensive analytics.

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2026-02-07
**Related Issue**: #3 - Philippines Payment Integration

---

## Features

### Core Capabilities

1. **Unified Payment Interface**
   - Single API for all payment gateways
   - Auto-selection based on availability and user preference
   - Transparent provider routing

2. **Intelligent Routing**
   - User preference-based routing
   - Automatic fallback to alternative gateway
   - Real-time availability checking

3. **Fee Management**
   - Transparent fee calculation
   - Provider-specific fee structures
   - Fee breakdown in responses

4. **Analytics & Reporting**
   - Success rates by provider
   - Transaction volume tracking
   - Failure analysis
   - Performance metrics

5. **Payment Method Management**
   - User default payment method
   - Payment history tracking
   - Method availability checking

---

## Architecture

### Components

```
Payment Orchestration Layer
├── Orchestrator Service (src/lib/payments/orchestrator.ts)
│   ├── Payment Routing
│   ├── Fee Calculation
│   ├── Fallback Logic
│   └── Analytics Engine
├── Unified API Routes (src/app/api/payments/)
│   ├── POST /initiate - Create payment
│   ├── GET /status/:id - Check status
│   ├── POST /refund - Process refund
│   └── POST /webhook - Handle webhooks
├── Payment Services
│   ├── Maya Service (src/lib/payments/maya/)
│   └── GCash Service (src/lib/payments/gcash/)
└── Database Layer
    ├── user_payment_preferences
    ├── payment_orchestration_logs
    ├── payment_method_availability
    └── payment_fee_configuration
```

---

## API Reference

### 1. Initiate Payment

**POST** `/api/payments/initiate`

Create a new payment with automatic gateway routing.

**Request Body:**
```json
{
  "amount": 500.00,
  "currency": "PHP",
  "description": "Booking #12345",
  "userId": "user-uuid",
  "userType": "passenger",
  "customerName": "Juan Dela Cruz",
  "customerEmail": "juan@example.com",
  "customerPhone": "+639171234567",
  "bookingId": "booking-uuid",
  "preferredProvider": "maya",
  "successUrl": "https://app.com/payments/success",
  "failureUrl": "https://app.com/payments/failure",
  "metadata": {
    "bookingType": "standard"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-1707300000-ABC123",
    "referenceNumber": "REF-1707300000-ABC123",
    "provider": "maya",
    "providerTransactionId": "maya-checkout-id",
    "amount": 500.00,
    "currency": "PHP",
    "fees": {
      "providerFee": 27.50,
      "platformFee": 0.00,
      "totalFee": 27.50,
      "feePercentage": 2.5
    },
    "netAmount": 472.50,
    "status": "pending",
    "redirectUrl": "https://checkout.maya.ph/...",
    "expiresAt": "2026-02-07T10:15:00Z",
    "createdAt": "2026-02-07T10:00:00Z"
  },
  "timestamp": "2026-02-07T10:00:00Z",
  "requestId": "req-uuid"
}
```

### 2. Check Payment Status

**GET** `/api/payments/status/:transactionId?sync=true`

Check payment status across any gateway.

**Query Parameters:**
- `sync` (optional): Sync with provider API (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-1707300000-ABC123",
    "provider": "maya",
    "status": "completed",
    "amount": 500.00,
    "currency": "PHP",
    "fees": {
      "providerFee": 27.50,
      "platformFee": 0.00,
      "totalFee": 27.50,
      "feePercentage": 2.5
    },
    "createdAt": "2026-02-07T10:00:00Z",
    "updatedAt": "2026-02-07T10:05:00Z",
    "completedAt": "2026-02-07T10:05:00Z",
    "providerDetails": {
      "providerTransactionId": "maya-checkout-id",
      "providerStatus": "PAYMENT_SUCCESS"
    }
  },
  "timestamp": "2026-02-07T10:10:00Z",
  "requestId": "req-uuid"
}
```

### 3. Process Refund

**POST** `/api/payments/refund`

Process refund for any payment.

**Request Body:**
```json
{
  "transactionId": "TXN-1707300000-ABC123",
  "amount": 250.00,
  "reason": "Customer cancellation",
  "requestedBy": "admin-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refundId": "REF-1707300000-DEF456",
    "transactionId": "TXN-1707300000-ABC123",
    "provider": "maya",
    "amount": 250.00,
    "currency": "PHP",
    "status": "pending",
    "createdAt": "2026-02-07T10:15:00Z"
  },
  "timestamp": "2026-02-07T10:15:00Z",
  "requestId": "req-uuid"
}
```

### 4. Unified Webhook Handler

**POST** `/api/payments/webhook`

Receives webhooks from all payment gateways.

**Auto-detects provider from:**
- Headers: `x-maya-signature`, `x-ebanx-signature`
- Payload structure

### 5. Available Payment Methods

**GET** `/api/payments/methods/available?amount=500`

Get available payment methods with fees.

**Response:**
```json
{
  "success": true,
  "data": {
    "methods": [
      {
        "provider": "maya",
        "available": true,
        "estimatedFee": 27.50,
        "feePercentage": 2.5,
        "processingTime": "15 minutes",
        "features": [
          "Credit/Debit cards",
          "E-wallet",
          "Quick checkout",
          "Instant confirmation"
        ]
      },
      {
        "provider": "gcash",
        "available": true,
        "estimatedFee": 27.50,
        "feePercentage": 3.5,
        "processingTime": "30 minutes",
        "features": [
          "GCash wallet",
          "QR code payment",
          "Mobile deep linking"
        ]
      }
    ],
    "timestamp": "2026-02-07T10:00:00Z"
  }
}
```

### 6. User Default Payment Method

**GET** `/api/payments/methods/default?userId=user-uuid`

Get user's default payment method.

**PUT** `/api/payments/methods/default`

Set user's default payment method.

**Request Body:**
```json
{
  "userId": "user-uuid",
  "paymentMethod": "maya"
}
```

### 7. Payment Analytics

**GET** `/api/payments/analytics?startDate=2026-01-01&endDate=2026-01-31`

Get payment analytics and metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "2026-01-01 - 2026-01-31",
    "totalTransactions": 1250,
    "totalAmount": 625000.00,
    "successRate": 97.5,
    "averageTransactionTime": 180,
    "byProvider": {
      "maya": {
        "transactions": 850,
        "amount": 425000.00,
        "successRate": 98.2,
        "averageTime": 120
      },
      "gcash": {
        "transactions": 400,
        "amount": 200000.00,
        "successRate": 95.5,
        "averageTime": 300
      }
    },
    "failures": {
      "total": 31,
      "byReason": {
        "insufficient_balance": 15,
        "expired": 10,
        "declined": 6
      }
    }
  }
}
```

---

## Fee Structure

### Maya Fees
- **Percentage**: 2.5%
- **Fixed**: PHP 15.00
- **Formula**: `(amount * 0.025) + 15`
- **Example**: PHP 500 → PHP 27.50 fee

### GCash Fees (via EBANX)
- **Percentage**: 3.5%
- **Fixed**: PHP 10.00
- **Formula**: `(amount * 0.035) + 10`
- **Example**: PHP 500 → PHP 27.50 fee

### Cash
- **No fees**

---

## Intelligent Routing Logic

### Provider Selection Flow

```
1. Check if user specified preferred provider
   ↓ Yes → Use preferred provider
   ↓ No
2. Check user's default payment method
   ↓ Found → Use default method
   ↓ Not found
3. Check provider availability
   ↓
4. Select based on priority:
   - Maya (lower fees, better UX)
   - GCash (fallback)
```

### Fallback Logic

If primary provider fails:
1. Log the failure
2. Select fallback provider
3. Retry with fallback
4. If fallback also fails → return error

**Fallback Matrix:**
- Maya fails → Try GCash
- GCash fails → Try Maya

---

## Database Schema

### user_payment_preferences
Stores user default payment methods.

```sql
CREATE TABLE user_payment_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  default_payment_method VARCHAR(20) NOT NULL,
  payment_history JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### payment_orchestration_logs
Audit trail for orchestration decisions.

```sql
CREATE TABLE payment_orchestration_logs (
  id UUID PRIMARY KEY,
  transaction_id VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  amount DECIMAL(12, 2),
  fees JSONB,
  success BOOLEAN,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
);
```

### payment_method_availability
Real-time provider availability tracking.

```sql
CREATE TABLE payment_method_availability (
  id UUID PRIMARY KEY,
  provider VARCHAR(20) UNIQUE NOT NULL,
  available BOOLEAN DEFAULT true,
  success_rate DECIMAL(5, 2),
  average_response_time_ms INTEGER,
  total_transactions INTEGER,
  failed_transactions INTEGER,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  checked_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

---

## Usage Examples

### TypeScript SDK

```typescript
import { getPaymentOrchestrator } from '@/lib/payments/orchestrator';

const orchestrator = getPaymentOrchestrator();

// Initiate payment
const payment = await orchestrator.initiatePayment({
  amount: 500,
  description: 'Booking payment',
  userId: 'user-123',
  userType: 'passenger',
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  successUrl: 'https://app.com/success',
  failureUrl: 'https://app.com/failure',
});

// Check status
const status = await orchestrator.getPaymentStatus(payment.transactionId, true);

// Process refund
const refund = await orchestrator.processRefund({
  transactionId: payment.transactionId,
  reason: 'Customer request',
  requestedBy: 'admin-123',
});

// Get analytics
const analytics = await orchestrator.getPaymentAnalytics(
  new Date('2026-01-01'),
  new Date('2026-01-31')
);
```

---

## Testing

### Integration Tests

Run integration tests:
```bash
npm run test:integration -- payment-orchestration
```

### Manual Testing

```bash
# Test payment initiation
curl -X POST http://localhost:4000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "description": "Test payment",
    "userId": "test-user",
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "successUrl": "http://localhost:4000/success",
    "failureUrl": "http://localhost:4000/failure"
  }'

# Check payment status
curl http://localhost:4000/api/payments/status/TXN-123?sync=true

# Get available methods
curl http://localhost:4000/api/payments/methods/available?amount=500

# Get analytics
curl "http://localhost:4000/api/payments/analytics?startDate=2026-01-01&endDate=2026-01-31"
```

---

## Monitoring

### Key Metrics

1. **Success Rate**: Overall payment success percentage
2. **Average Response Time**: Time to create payment
3. **Provider Availability**: Real-time gateway status
4. **Fallback Rate**: How often fallback is triggered

### Alerts

Set up alerts for:
- Success rate < 95%
- Average response time > 5 seconds
- Provider unavailable > 5 minutes
- Fallback rate > 10%

---

## Troubleshooting

### Payment Fails Immediately

**Check:**
1. Provider availability: `/api/health/payments`
2. Request validation errors
3. Provider API keys configured

### Fallback Not Working

**Check:**
1. Fallback provider availability
2. Orchestration logs: `payment_orchestration_logs`
3. Error messages in logs

### Fees Incorrect

**Check:**
1. Fee configuration: `payment_fee_configuration`
2. Provider-specific fee structures
3. Calculation logic in orchestrator

---

## Security

### Data Protection
- All sensitive data encrypted at rest
- PCI-DSS compliant payment handling
- No card data stored locally

### Access Control
- API authentication required
- Rate limiting enabled
- Webhook signature verification

---

## Performance

### Benchmarks
- Payment initiation: < 500ms
- Status check: < 200ms
- Analytics query: < 1s

### Optimizations
- Database indexes on transaction_id
- Materialized views for analytics
- Connection pooling
- Cached availability checks

---

## Support

### Documentation
- API Reference: This document
- Maya Integration: `docs/MAYA_INTEGRATION.md`
- GCash Integration: `docs/GCASH_INTEGRATION.md`

### Contact
- Technical Issues: dev@opstower.ph
- Payment Issues: payments@opstower.ph

---

## Changelog

### Version 1.0.0 (2026-02-07)
- ✅ Initial release
- ✅ Maya and GCash integration
- ✅ Intelligent routing with fallback
- ✅ Fee calculation
- ✅ Analytics dashboard
- ✅ User preferences
- ✅ Comprehensive API

---

**Production Status**: ✅ Ready for Deployment
