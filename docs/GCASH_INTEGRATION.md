# GCash Payment Gateway Integration

## Overview

GCash integration via EBANX payment gateway for OpsTower V1 2026. This integration enables customers to pay using their GCash wallet through a secure EBANX-powered checkout flow.

## Features

- **Mobile deep linking** to GCash app for seamless mobile experience
- **QR code display** for web browsers with qrcode.react
- **30-minute payment timeout** for customer convenience
- **Real-time webhook status updates** from EBANX
- **BSP-compliant transaction logging** for regulatory compliance
- **Secure payment processing** with EBANX infrastructure
- **Full refund support** through EBANX API

## Payment Flow

### Standard Flow

1. Customer selects GCash payment method in PaymentMethodSelect component
2. Backend creates EBANX checkout via POST `/api/payments/gcash/initiate`
3. **Mobile devices**: Deep link redirects directly to GCash app
4. **Web browsers**: QR code displayed for scanning with GCash mobile app
5. Customer completes payment in GCash app
6. EBANX sends webhook notification to `/api/payments/gcash/webhook`
7. Backend updates payment status in database
8. Customer redirected to `/payments/gcash/callback` with status

### Mobile Experience

```
User clicks "Pay with GCash"
→ User agent detection identifies mobile device
→ EBANX returns deep link URL
→ Automatic redirect to GCash app
→ User completes payment in GCash
→ Returns to callback page with status
```

### Web Experience

```
User clicks "Pay with GCash"
→ User agent detection identifies desktop/laptop
→ EBANX returns QR code URL
→ QR code displayed on screen
→ User scans with GCash mobile app
→ User completes payment in GCash
→ Page polls for status or redirects on webhook
```

## Components

### GCashPayment Component

**Location**: `/src/components/payments/GCashPayment.tsx`

Main payment UI component with the following features:

- Amount display with PHP currency formatting
- Booking ID and description display
- User agent detection for mobile vs. web
- QR code rendering with qrcode.react library
- Mobile deep linking support
- Loading and error states
- Payment status checking
- Security badge display

**Props**:

```typescript
interface GCashPaymentProps {
  amount: number;
  description: string;
  bookingId?: string;
  userId: string;
  userType?: 'passenger' | 'driver' | 'operator';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}
```

**Usage Example**:

```tsx
import GCashPayment from '@/components/payments/GCashPayment';

<GCashPayment
  amount={1500.00}
  description="Booking Payment for Trip #12345"
  bookingId="BK-12345"
  userId="user_123"
  userType="passenger"
  customerName="Juan Dela Cruz"
  customerEmail="juan@example.com"
  customerPhone="+639171234567"
  onSuccess={() => console.log('Payment successful')}
  onError={(error) => console.error('Payment failed:', error)}
  onCancel={() => console.log('Payment cancelled')}
/>
```

### PaymentMethodSelect Component

**Location**: `/src/components/payments/PaymentMethodSelect.tsx`

Updated to show GCash as an available payment option:

```typescript
{
  id: 'gcash',
  name: 'GCash',
  description: 'Pay with GCash wallet',
  logo: '/images/gcash-logo.svg',
  available: true  // ✓ Enabled
}
```

### GCash Callback Page

**Location**: `/src/app/payments/gcash/callback/page.tsx`

Handles payment completion redirects from EBANX/GCash:

- Extracts status and transaction ID from URL params
- Fetches payment details from backend
- Displays PaymentConfirmation component
- Maps EBANX status to internal status
- Provides loading states during verification

### Reusable Components

The following components are shared between Maya and GCash:

- **PaymentConfirmation** (`/src/components/payments/PaymentConfirmation.tsx`)
  - Success, failed, pending, and cancelled states
  - Transaction details display
  - Receipt download button
  - Navigation actions

- **PaymentError** (`/src/components/payments/PaymentError.tsx`)
  - Error message display
  - Retry functionality
  - Common issues list
  - Support contact link

## API Endpoints

### POST `/api/payments/gcash/initiate`

Initiate a new GCash payment through EBANX.

**Request Body**:

```typescript
{
  amount: number;
  currency: 'PHP';
  description: string;
  userId: string;
  userType?: 'passenger' | 'driver' | 'operator';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingId?: string;
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}
```

**Response**:

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    redirectUrl: string;
    qrCodeUrl?: string;
    expiresAt: string;
    status: 'pending';
  }
}
```

### POST `/api/payments/gcash/webhook`

Handle webhook notifications from EBANX.

**Security**: Validates webhook signature using `EBANX_WEBHOOK_SECRET`

**Processed Events**:
- Payment completed
- Payment failed
- Payment cancelled
- Refund processed

### GET `/api/payments/gcash/status/:transactionId`

Query the current status of a payment.

**Response**:

```typescript
{
  success: true;
  data: {
    transactionId: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    amount: number;
    currency: 'PHP';
    createdAt: string;
    updatedAt: string;
  }
}
```

### POST `/api/payments/gcash/refund`

Process a refund for a completed payment.

**Request Body**:

```typescript
{
  transactionId: string;
  amount?: number;  // Optional: partial refund
  reason: string;
}
```

**Response**:

```typescript
{
  success: true;
  data: {
    refundId: string;
    transactionId: string;
    amount: number;
    status: 'processing' | 'completed';
    createdAt: string;
  }
}
```

## Environment Variables

Configure the following environment variables in `.env.local`:

```bash
# EBANX API Configuration
EBANX_API_KEY=your_api_key_here
EBANX_API_SECRET=your_api_secret_here
EBANX_MERCHANT_ID=your_merchant_id_here
EBANX_WEBHOOK_SECRET=your_webhook_secret_here

# EBANX Environment
EBANX_BASE_URL=https://sandbox.ebanx.com/api  # Sandbox
# EBANX_BASE_URL=https://api.ebanx.com         # Production
EBANX_SANDBOX_MODE=true                        # Set to false in production

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000      # Your app URL
```

## Testing

### Sandbox Testing

1. **Request EBANX sandbox credentials**:
   - Sign up at EBANX developer portal
   - Get sandbox API key, secret, and merchant ID
   - Configure webhook URL in EBANX dashboard

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with sandbox credentials
   ```

3. **Test payment flow**:
   - **Mobile**: Test deep link to GCash app (may require EBANX test app)
   - **Web**: Verify QR code generation and display
   - Use EBANX test card numbers for sandbox payments

4. **Verify webhook receipt**:
   - Monitor webhook endpoint logs
   - Verify signature validation
   - Check database status updates

5. **Check payment status**:
   - Query status endpoint
   - Verify status mapping (pending → completed)
   - Test callback page display

### Test Scenarios

- ✓ Successful payment (mobile deep link)
- ✓ Successful payment (web QR code)
- ✓ Payment timeout (30 minutes)
- ✓ Payment cancellation
- ✓ Payment failure
- ✓ Network error handling
- ✓ Invalid webhook signature
- ✓ Webhook duplicate handling
- ✓ Partial refund
- ✓ Full refund

### Production Testing

1. **Apply for GCash merchant account** through EBANX
2. **Get EBANX production credentials** after approval
3. **Configure production environment variables**
4. **Update EBANX_BASE_URL** to production endpoint
5. **Set EBANX_SANDBOX_MODE=false**
6. **Test with real payment** (minimum PHP 10.00)
7. **Verify transaction in EBANX dashboard**

## Deployment Checklist

Before deploying to production:

- [ ] EBANX production credentials configured
- [ ] Webhook URL configured in EBANX dashboard
- [ ] Webhook signature verification tested
- [ ] Database migration run (046_payment_tables)
- [ ] GCash merchant account approved
- [ ] QR code generation tested on multiple browsers
- [ ] Mobile deep linking tested on iOS and Android
- [ ] Payment timeout handling verified (30 minutes)
- [ ] Error handling and fallbacks tested
- [ ] Production payment tested with real money
- [ ] BSP compliance documentation complete
- [ ] Monitoring and alerting configured
- [ ] Customer support informed of new payment method

## Architecture

### Backend Structure

```
src/
├── lib/
│   └── payments/
│       └── gcash/
│           ├── client.ts       # EBANX API client
│           ├── service.ts      # Business logic layer
│           └── types.ts        # TypeScript types
└── app/
    └── api/
        └── payments/
            └── gcash/
                ├── initiate/
                │   └── route.ts
                ├── webhook/
                │   └── route.ts
                ├── status/
                │   └── [transactionId]/
                │       └── route.ts
                └── refund/
                    └── route.ts
```

### Frontend Structure

```
src/
├── components/
│   └── payments/
│       ├── GCashPayment.tsx          # Main GCash component
│       ├── PaymentMethodSelect.tsx    # Payment method selector
│       ├── PaymentConfirmation.tsx    # Shared confirmation
│       └── PaymentError.tsx           # Shared error display
└── app/
    └── payments/
        └── gcash/
            └── callback/
                └── page.tsx           # Callback page
```

## Key Differences: GCash vs Maya

| Feature | Maya | GCash (EBANX) |
|---------|------|---------------|
| **Redirect** | Direct to Maya checkout | Mobile: deep link, Web: QR code |
| **Timeout** | 15 minutes | 30 minutes |
| **Display** | Checkout page | QR code + deep link |
| **Branding** | Green (Maya colors) | Blue (GCash colors) |
| **Provider** | Maya API directly | EBANX integration |
| **QR Code** | Not used | Primary method for web |
| **Mobile UX** | Web redirect | Native deep linking |

## Security

### Webhook Signature Verification

All webhooks are verified using HMAC-SHA256 signatures:

```typescript
const signature = crypto
  .createHmac('sha256', EBANX_WEBHOOK_SECRET)
  .update(JSON.stringify(webhookBody))
  .digest('hex');

if (signature !== receivedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Data Protection

- Customer data encrypted at rest
- PCI DSS compliance through EBANX
- No card data stored locally
- Secure HTTPS-only communication

### BSP Compliance

- All transactions logged to database
- Audit trail maintained
- Transaction metadata includes timestamps
- Refund tracking and reconciliation

## Troubleshooting

### QR Code Not Displaying

- Verify qrcode.react is installed: `npm list qrcode.react`
- Check browser console for errors
- Ensure qrCodeUrl is returned from backend
- Verify user agent detection logic

### Mobile Deep Link Not Working

- Check redirectUrl is returned from backend
- Verify GCash app is installed on device
- Test with EBANX test environment first
- Check for URL scheme conflicts

### Webhook Not Receiving

- Verify webhook URL in EBANX dashboard
- Check webhook signature validation
- Ensure HTTPS endpoint (required by EBANX)
- Check server firewall allows EBANX IPs

### Payment Status Not Updating

- Check webhook handler logs
- Verify database connection
- Check transaction ID mapping
- Test status endpoint directly

## Support Resources

- **EBANX Documentation**: https://docs.ebanx.com/
- **EBANX API Reference**: https://developers.ebanx.com/api-reference
- **GCash Merchant Portal**: https://www.gcash.com/business
- **GCash Developer Docs**: https://developer.gcash.com/
- **OpsTower Support**: support@opstower.com

## Future Enhancements

Potential improvements for future versions:

- [ ] Real-time payment status polling with WebSockets
- [ ] QR code expiration countdown timer
- [ ] Payment retry with exponential backoff
- [ ] Multi-currency support (beyond PHP)
- [ ] Installment payment options
- [ ] Saved payment methods
- [ ] Receipt email automation
- [ ] Payment analytics dashboard
- [ ] A/B testing for payment flows
- [ ] Accessibility improvements (WCAG 2.1 AA)

## Version History

- **v1.0.0** (2026-02-07): Initial GCash integration
  - EBANX API client implementation
  - Payment initiation, webhook, status, refund endpoints
  - GCashPayment React component
  - QR code display for web
  - Mobile deep linking
  - Callback page with status verification
  - Full documentation

---

**Last Updated**: February 7, 2026
**Maintained By**: OpsTower Development Team
**Status**: Production Ready (pending EBANX approval)
