# Quick Start Guide: Payment Integration & Monitoring

## Overview

This guide helps you quickly get started with OpsTower's new unified payment orchestration and production monitoring systems.

---

## Payment Integration Quick Start

### 1. Initiate a Payment

**Endpoint**: `POST /api/payments/initiate`

**Simple Example**:
```bash
curl -X POST http://localhost:4000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "description": "Booking payment",
    "userId": "user-123",
    "customerName": "Juan Dela Cruz",
    "customerEmail": "juan@example.com",
    "successUrl": "http://localhost:4000/payments/success",
    "failureUrl": "http://localhost:4000/payments/failure"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-1707300000-ABC123",
    "provider": "maya",
    "amount": 500.00,
    "fees": {
      "totalFee": 27.50,
      "providerFee": 27.50,
      "feePercentage": 2.5
    },
    "redirectUrl": "https://checkout.maya.ph/...",
    "expiresAt": "2026-02-07T10:15:00Z"
  }
}
```

**Next Step**: Redirect user to `redirectUrl` to complete payment.

### 2. Check Payment Status

**Endpoint**: `GET /api/payments/status/:transactionId`

```bash
curl http://localhost:4000/api/payments/status/TXN-1707300000-ABC123?sync=true
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-1707300000-ABC123",
    "provider": "maya",
    "status": "completed",
    "amount": 500.00,
    "completedAt": "2026-02-07T10:05:00Z"
  }
}
```

### 3. Get Available Payment Methods

**Endpoint**: `GET /api/payments/methods/available`

```bash
curl http://localhost:4000/api/payments/methods/available?amount=500
```

**Response**:
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
        "features": ["Credit/Debit cards", "E-wallet", "Quick checkout"]
      },
      {
        "provider": "gcash",
        "available": true,
        "estimatedFee": 27.50,
        "feePercentage": 3.5,
        "features": ["GCash wallet", "QR code", "Mobile deep linking"]
      }
    ]
  }
}
```

### 4. Set User Default Payment Method

**Endpoint**: `PUT /api/payments/methods/default`

```bash
curl -X PUT http://localhost:4000/api/payments/methods/default \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "paymentMethod": "maya"
  }'
```

### 5. Get Payment Analytics

**Endpoint**: `GET /api/payments/analytics`

```bash
curl "http://localhost:4000/api/payments/analytics?startDate=2026-01-01&endDate=2026-01-31"
```

---

## TypeScript Integration

### Using the Orchestrator Service

```typescript
import { getPaymentOrchestrator } from '@/lib/payments/orchestrator';

const orchestrator = getPaymentOrchestrator();

// Initiate payment
const payment = await orchestrator.initiatePayment({
  amount: 500,
  description: 'Booking #12345',
  userId: 'user-123',
  userType: 'passenger',
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  successUrl: 'https://app.com/success',
  failureUrl: 'https://app.com/failure',
  // Optional: specify provider
  preferredProvider: 'maya'
});

console.log('Payment initiated:', payment.transactionId);
console.log('Redirect URL:', payment.redirectUrl);
console.log('Provider:', payment.provider);
console.log('Fees:', payment.fees);

// Check status
const status = await orchestrator.getPaymentStatus(
  payment.transactionId,
  true // sync with provider
);

console.log('Payment status:', status.status);

// Get analytics
const analytics = await orchestrator.getPaymentAnalytics(
  new Date('2026-01-01'),
  new Date('2026-01-31')
);

console.log('Total transactions:', analytics.totalTransactions);
console.log('Success rate:', analytics.successRate);
```

---

## Production Monitoring Quick Start

### 1. Access Monitoring Dashboard

**URL**: `http://localhost:4000/monitoring`

**Features**:
- Real-time system health overview
- Payment gateway status
- Database and Redis monitoring
- WebSocket connections
- Auto-refresh every 30 seconds

### 2. Check Overall System Health

**Endpoint**: `GET /api/health?detailed=true`

```bash
curl http://localhost:4000/api/health?detailed=true
```

**Response**:
```json
{
  "success": true,
  "data": {
    "overall": "HEALTHY",
    "services": [
      {
        "name": "database",
        "status": "HEALTHY",
        "responseTime": 45,
        "uptime": 86400
      },
      {
        "name": "redis",
        "status": "HEALTHY",
        "responseTime": 12
      }
    ],
    "timestamp": "2026-02-07T10:00:00Z"
  }
}
```

**Status Codes**:
- `200` - System healthy or degraded
- `503` - System unhealthy (critical issues)

### 3. Check Payment Gateway Health

**Endpoint**: `GET /api/health/payments`

```bash
curl http://localhost:4000/api/health/payments
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "gateways": [
      {
        "provider": "maya",
        "available": true,
        "successRate": 98.5,
        "avgResponseTime": 450,
        "totalTransactions": 1250
      },
      {
        "provider": "gcash",
        "available": true,
        "successRate": 96.2,
        "avgResponseTime": 650,
        "totalTransactions": 850
      }
    ]
  }
}
```

### 4. Check Database Health

**Endpoint**: `GET /api/health/database`

```bash
curl http://localhost:4000/api/health/database
```

### 5. Check Redis Health

**Endpoint**: `GET /api/health/redis`

```bash
curl http://localhost:4000/api/health/redis
```

---

## Common Scenarios

### Scenario 1: Accept Payment from User

```typescript
// 1. Get available payment methods
const methods = await orchestrator.getAvailablePaymentMethods(bookingAmount);

// 2. Show user the options with fees
// User selects Maya

// 3. Initiate payment
const payment = await orchestrator.initiatePayment({
  amount: bookingAmount,
  description: `Booking #${bookingId}`,
  userId: user.id,
  userType: 'passenger',
  customerName: user.name,
  customerEmail: user.email,
  bookingId: bookingId,
  preferredProvider: 'maya', // User's choice
  successUrl: `${baseUrl}/payments/success?bookingId=${bookingId}`,
  failureUrl: `${baseUrl}/payments/failure?bookingId=${bookingId}`,
});

// 4. Redirect user to payment gateway
window.location.href = payment.redirectUrl;
```

### Scenario 2: Handle Payment Callback

```typescript
// On success callback page
const transactionId = searchParams.get('transactionId');

// Check payment status
const status = await orchestrator.getPaymentStatus(transactionId, true);

if (status.status === 'completed') {
  // Update booking status
  // Send confirmation email
  // Show success message
} else {
  // Handle pending/failed payment
}
```

### Scenario 3: Process Refund

```typescript
const refund = await orchestrator.processRefund({
  transactionId: originalPayment.transactionId,
  amount: refundAmount, // Optional: partial refund
  reason: 'Customer cancellation',
  requestedBy: adminUserId,
});

console.log('Refund initiated:', refund.refundId);
console.log('Status:', refund.status); // 'pending'
```

### Scenario 4: Monitor System Health

```typescript
// Fetch all health data
const [system, payments, database] = await Promise.all([
  fetch('/api/health?detailed=true'),
  fetch('/api/health/payments'),
  fetch('/api/health/database'),
]);

const systemHealth = await system.json();
const paymentHealth = await payments.json();
const dbHealth = await database.json();

// Check if everything is healthy
const isHealthy =
  systemHealth.data.overall === 'HEALTHY' &&
  paymentHealth.data.status === 'healthy' &&
  dbHealth.data.status === 'healthy';

if (!isHealthy) {
  // Alert operations team
  sendAlert('System health degraded');
}
```

---

## Fee Calculation Examples

### Maya Payment
```
Amount: PHP 500.00
Formula: (500 × 0.025) + 15 = 27.50
User pays: PHP 500.00
Merchant receives: PHP 472.50
Maya fee: PHP 27.50
```

### GCash Payment
```
Amount: PHP 500.00
Formula: (500 × 0.035) + 10 = 27.50
User pays: PHP 500.00
Merchant receives: PHP 472.50
GCash fee: PHP 27.50
```

---

## Webhook Integration

### Unified Webhook Endpoint

**Endpoint**: `POST /api/payments/webhook`

The webhook automatically detects the provider from:
- Headers: `x-maya-signature` or `x-ebanx-signature`
- Payload structure

**No configuration needed** - just point both gateways to:
```
https://yourdomain.com/api/payments/webhook
```

---

## Environment Variables

### Payment Gateway Configuration

```bash
# Maya Configuration
MAYA_PUBLIC_KEY=pk-xxx
MAYA_SECRET_KEY=sk-xxx
MAYA_WEBHOOK_SECRET=webhook-secret
MAYA_SANDBOX_MODE=true

# GCash Configuration (via EBANX)
EBANX_INTEGRATION_KEY=your-integration-key
EBANX_WEBHOOK_SECRET=webhook-secret
EBANX_SANDBOX_MODE=true
```

---

## Monitoring Setup

### Auto-Refresh Configuration

The monitoring dashboard auto-refreshes every 30 seconds. You can:
- Click "Refresh Now" for immediate update
- Check "Last updated" timestamp

### Alert Thresholds

Default thresholds (configurable):
- Payment success rate < 95% → Warning
- Payment success rate < 90% → Critical
- Response time > 5s → Warning
- Gateway unavailable → Critical

---

## Troubleshooting

### Payment Issues

**Problem**: Payment fails immediately
**Solution**:
1. Check `/api/health/payments` for gateway status
2. Verify environment variables
3. Check orchestration logs: `payment_orchestration_logs`

**Problem**: Wrong fees calculated
**Solution**:
1. Check `payment_fee_configuration` table
2. Verify provider fee structure
3. Review orchestrator fee calculation

### Monitoring Issues

**Problem**: Dashboard not loading
**Solution**:
1. Check browser console for errors
2. Verify `/api/health` endpoint responding
3. Check authentication status

**Problem**: Metrics not updating
**Solution**:
1. Check auto-refresh is enabled
2. Verify health check endpoints responding
3. Check database connection

---

## Next Steps

1. **Test in Sandbox**: Use sandbox credentials to test full payment flow
2. **Monitor Performance**: Watch the monitoring dashboard for issues
3. **Review Analytics**: Check payment analytics daily
4. **Set Up Alerts**: Configure email/SMS alerts for critical issues
5. **Optimize**: Use analytics to optimize provider selection

---

## Support

### Documentation
- Payment Orchestration: `docs/PAYMENT_ORCHESTRATION.md`
- Production Monitoring: `docs/PRODUCTION_MONITORING.md`
- Full Report: `docs/ISSUE_3_22_COMPLETION_REPORT.md`

### Health Check URLs
- Overall: `/api/health`
- Database: `/api/health/database`
- Redis: `/api/health/redis`
- Payments: `/api/health/payments`
- WebSockets: `/api/health/websockets`

### Monitoring Dashboard
- URL: `/monitoring`
- Auto-refresh: Every 30 seconds
- Manual refresh: "Refresh Now" button

---

## Quick Reference

### Payment Endpoints
```
POST   /api/payments/initiate          - Create payment
GET    /api/payments/status/:id        - Check status
POST   /api/payments/refund            - Process refund
POST   /api/payments/webhook           - Webhook handler
GET    /api/payments/methods/available - List methods
GET/PUT /api/payments/methods/default  - User preference
GET    /api/payments/analytics         - Get analytics
```

### Health Check Endpoints
```
GET /api/health              - Overall health
GET /api/health/database     - Database health
GET /api/health/redis        - Redis health
GET /api/health/payments     - Payment gateways
GET /api/health/websockets   - WebSocket health
```

### Monitoring
```
Dashboard: /monitoring
Auto-refresh: 30 seconds
Manual refresh: Click "Refresh Now"
```

---

**Ready to go! Start with the monitoring dashboard to see system status, then test a payment! 🚀**
