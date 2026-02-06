# GCash Frontend Testing Guide

## Overview

This guide provides step-by-step testing procedures for the GCash payment frontend implementation completed on February 7, 2026.

## Components to Test

1. **GCashPayment Component** (`/src/components/payments/GCashPayment.tsx`)
2. **PaymentMethodSelect Component** (GCash option enabled)
3. **GCash Callback Page** (`/src/app/payments/gcash/callback/page.tsx`)
4. **Shared Payment Callback** (`/src/app/payments/callback/page.tsx`)

## Prerequisites

Before testing:

```bash
# 1. Verify QR code library is installed
npm list qrcode.react

# 2. Verify environment variables
cat .env.local | grep EBANX

# 3. Run development server
npm run dev

# 4. Verify build passes
npm run build
```

## Test Cases

### 1. Component Rendering

#### Test 1.1: GCashPayment Component Renders

**Steps**:
1. Navigate to a page that uses GCashPayment component
2. Verify component displays correctly
3. Check for GCash branding (blue colors)
4. Verify amount displays with PHP formatting

**Expected Result**:
- Component renders without errors
- Blue GCash branding visible
- Amount formatted as ₱X,XXX.XX
- "Pay with GCash" button visible

#### Test 1.2: PaymentMethodSelect Shows GCash

**Steps**:
1. Navigate to payment method selection page
2. Verify GCash option is visible
3. Check GCash is marked as available (not "Coming Soon")
4. Verify GCash logo displays

**Expected Result**:
- GCash appears as a payment option
- Shows "available: true"
- No "Coming Soon" badge
- GCash logo visible (or placeholder)

---

### 2. Desktop/Web Flow

#### Test 2.1: QR Code Display (Web Browser)

**Device**: Desktop/Laptop computer

**Steps**:
1. Open application in Chrome/Firefox/Safari
2. Select GCash as payment method
3. Click "Pay with GCash" button
4. Observe QR code display

**Expected Result**:
- User agent detected as desktop
- QR code displays in blue-bordered box
- QR code is scannable (200x200px)
- Message shows "Scan QR Code with GCash App"
- "Check Payment Status" button appears

**API Call to Verify**:
```javascript
// Check browser console network tab
POST /api/payments/gcash/initiate
Response should include:
{
  data: {
    qrCodeUrl: "https://...",
    checkoutId: "...",
    redirectUrl: "..."
  }
}
```

#### Test 2.2: QR Code Scanning (Manual)

**Requirements**: Mobile device with GCash app

**Steps**:
1. Display QR code on desktop
2. Open GCash app on mobile
3. Use app's QR scanner
4. Scan the displayed QR code

**Expected Result**:
- GCash app recognizes QR code
- Payment details appear in GCash
- Amount matches desktop display
- Description shows correctly

---

### 3. Mobile Flow

#### Test 3.1: Mobile Deep Linking (Mobile Browser)

**Device**: iOS or Android smartphone

**Steps**:
1. Open application in mobile Safari/Chrome
2. Select GCash as payment method
3. Click "Pay with GCash" button
4. Observe redirect behavior

**Expected Result**:
- User agent detected as mobile
- Message shows "Redirecting to GCash App..."
- Automatic redirect to GCash app
- If redirect fails, manual button appears

**User Agent Detection Check**:
```javascript
// Should detect as mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
// Expected: true on mobile devices
```

#### Test 3.2: Deep Link Fallback

**Steps**:
1. On mobile, initiate payment
2. If auto-redirect fails, click "Open GCash App"
3. Verify manual redirect works

**Expected Result**:
- Button visible if auto-redirect fails
- Manual click redirects to GCash app
- GCash app opens with payment details

---

### 4. Payment Status Flow

#### Test 4.1: Payment Status Checking

**Steps**:
1. After initiating payment (QR or mobile)
2. Click "Check Payment Status" button
3. Observe status page

**Expected Result**:
- Redirects to `/payments/callback?transactionId=...&provider=gcash`
- Loading spinner shows "Verifying your GCash payment..."
- Status fetched from `/api/payments/gcash/status/:transactionId`

#### Test 4.2: Success Callback

**Scenario**: Successful payment

**Steps**:
1. Complete payment in GCash (sandbox)
2. Wait for redirect or check status
3. Observe confirmation page

**Expected Result**:
- Green success icon displays
- Status badge shows "Completed"
- Transaction ID visible
- Amount matches payment
- "Download Receipt" button appears
- Provider shows "gcash"

#### Test 4.3: Failed Callback

**Scenario**: Payment failure

**Steps**:
1. Simulate payment failure
2. Observe error handling

**Expected Result**:
- Red error icon displays
- Status badge shows "Failed"
- Error message displayed
- "Try Again" button appears
- Provider shows "gcash"

#### Test 4.4: Cancelled Callback

**Scenario**: User cancels payment

**Steps**:
1. Initiate payment
2. Click cancel in GCash
3. Observe callback

**Expected Result**:
- Yellow warning icon displays
- Status badge shows "Cancelled"
- "Payment Cancelled" message
- Option to retry

---

### 5. Error Handling

#### Test 5.1: Network Error

**Steps**:
1. Open DevTools Network tab
2. Throttle network to "Slow 3G"
3. Initiate payment
4. Observe behavior

**Expected Result**:
- Loading state shows during API call
- Timeout error displayed if request fails
- User can retry payment
- No app crash

#### Test 5.2: Invalid API Response

**Steps**:
1. Mock API to return error
2. Initiate payment
3. Observe error handling

**Expected Result**:
- Error message displays clearly
- Technical details hidden from user
- Retry button available
- Console logs error for debugging

#### Test 5.3: Missing QR Code URL

**Steps**:
1. Mock API to return no qrCodeUrl
2. On desktop, initiate payment
3. Observe fallback

**Expected Result**:
- Fallback to redirect URL
- Or error message displayed
- No blank QR code shown

---

### 6. Accessibility Testing

#### Test 6.1: Keyboard Navigation

**Steps**:
1. Use Tab key to navigate
2. Press Enter to activate buttons
3. Check focus indicators

**Expected Result**:
- All buttons keyboard accessible
- Clear focus states visible
- Logical tab order maintained

#### Test 6.2: Screen Reader

**Tools**: VoiceOver (Mac), NVDA (Windows)

**Steps**:
1. Enable screen reader
2. Navigate through payment flow
3. Verify all content is announced

**Expected Result**:
- Amount announced with "pesos"
- Button purposes clear
- Status updates announced
- Error messages read aloud

---

### 7. Multi-Browser Testing

#### Test 7.1: Cross-Browser Compatibility

**Browsers to Test**:
- [ ] Chrome (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop)
- [ ] Edge (Desktop)
- [ ] Safari (iOS)
- [ ] Chrome (Android)

**For Each Browser**:
1. Component renders correctly
2. QR code displays (desktop)
3. Colors and styling correct
4. Buttons functional
5. API calls succeed

---

### 8. Integration Testing

#### Test 8.1: Backend Integration

**Steps**:
1. Verify all API endpoints respond
2. Check webhook signature validation
3. Test status updates from webhook
4. Verify database records created

**API Endpoints to Test**:
```bash
# Initiate
curl -X POST http://localhost:3000/api/payments/gcash/initiate \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"currency":"PHP",...}'

# Status
curl http://localhost:3000/api/payments/gcash/status/TXN123

# Webhook (requires valid signature)
curl -X POST http://localhost:3000/api/payments/gcash/webhook \
  -H "Content-Type: application/json" \
  -H "X-EBANX-Signature: ..." \
  -d '{...webhook payload...}'
```

#### Test 8.2: Database Verification

**Steps**:
1. Initiate payment
2. Check database for transaction record
3. Verify status updates correctly

**Expected Database Records**:
```sql
SELECT * FROM payment_transactions
WHERE provider = 'gcash'
ORDER BY created_at DESC
LIMIT 5;

-- Should show:
-- - transaction_id
-- - status (pending → completed/failed)
-- - amount
-- - created_at, updated_at
-- - metadata (user info, booking)
```

---

### 9. Performance Testing

#### Test 9.1: Component Load Time

**Steps**:
1. Open Chrome DevTools Performance tab
2. Record page load with GCashPayment
3. Analyze component render time

**Expected Result**:
- Component renders in < 500ms
- QR code generates in < 200ms
- No blocking operations

#### Test 9.2: API Response Time

**Steps**:
1. Monitor API call durations
2. Test under load (10+ concurrent requests)

**Expected Result**:
- Initiate endpoint: < 2 seconds
- Status endpoint: < 500ms
- Webhook processing: < 1 second

---

### 10. Security Testing

#### Test 10.1: Input Validation

**Steps**:
1. Try negative amounts
2. Try invalid currency
3. Try missing required fields

**Expected Result**:
- Validation errors returned
- No payment created with invalid data
- Error messages user-friendly

#### Test 10.2: Webhook Signature

**Steps**:
1. Send webhook with invalid signature
2. Send webhook with no signature
3. Verify rejection

**Expected Result**:
- Invalid signatures rejected (401/403)
- Webhook not processed
- Error logged for monitoring

---

## Automated Test Script

Create automated tests in `__tests__/payments/gcash-frontend.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GCashPayment from '@/components/payments/GCashPayment';

describe('GCashPayment Component', () => {
  test('renders with correct branding', () => {
    render(<GCashPayment amount={1000} {...props} />);
    expect(screen.getByText(/Pay with GCash/i)).toBeInTheDocument();
  });

  test('displays QR code on desktop', async () => {
    // Mock desktop user agent
    global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0)';
    render(<GCashPayment amount={1000} {...props} />);

    fireEvent.click(screen.getByText(/Pay ₱1,000.00/i));

    await waitFor(() => {
      expect(screen.getByText(/Scan QR Code/i)).toBeInTheDocument();
    });
  });

  test('shows mobile redirect on mobile', async () => {
    // Mock mobile user agent
    global.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)';
    render(<GCashPayment amount={1000} {...props} />);

    fireEvent.click(screen.getByText(/Pay ₱1,000.00/i));

    await waitFor(() => {
      expect(screen.getByText(/Redirecting to GCash App/i)).toBeInTheDocument();
    });
  });

  test('handles errors gracefully', async () => {
    // Mock API error
    global.fetch = jest.fn(() => Promise.reject('API Error'));

    render(<GCashPayment amount={1000} {...props} />);
    fireEvent.click(screen.getByText(/Pay/i));

    await waitFor(() => {
      expect(screen.getByText(/Payment failed/i)).toBeInTheDocument();
    });
  });
});
```

---

## Testing Checklist

### Pre-Deployment Checklist

- [ ] All components render without errors
- [ ] QR code displays on desktop browsers
- [ ] Mobile deep linking works on iOS
- [ ] Mobile deep linking works on Android
- [ ] Payment status fetching works
- [ ] Success callback displays correctly
- [ ] Failed callback displays correctly
- [ ] Cancelled callback displays correctly
- [ ] Error handling works for all error types
- [ ] All API endpoints respond correctly
- [ ] Webhook signature validation passes
- [ ] Database records created correctly
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Mobile browser compatibility verified
- [ ] Keyboard navigation works
- [ ] Screen reader accessibility verified
- [ ] Performance benchmarks met
- [ ] Security tests pass
- [ ] Build passes without errors
- [ ] TypeScript types validated

### Production Readiness Checklist

- [ ] EBANX production credentials configured
- [ ] Webhook URL configured in EBANX dashboard
- [ ] GCash merchant account approved
- [ ] Real payment tested with minimum amount
- [ ] QR code tested with actual GCash app
- [ ] Deep linking tested on real mobile devices
- [ ] Error monitoring configured (Sentry, etc.)
- [ ] Logging configured for debugging
- [ ] Customer support trained on GCash flow
- [ ] Documentation reviewed and complete
- [ ] Rollback plan prepared
- [ ] BSP compliance verified

---

## Known Issues & Limitations

### Current Limitations

1. **QR Code Placeholder**: Without EBANX sandbox credentials, QR codes show placeholder
2. **Deep Link Testing**: Requires EBANX test environment or production setup
3. **Webhook Testing**: Requires publicly accessible HTTPS endpoint
4. **No Real-Time Polling**: Status updates depend on webhooks or manual refresh

### Future Improvements

1. Add WebSocket support for real-time status updates
2. Implement QR code expiration countdown
3. Add payment retry with exponential backoff
4. Enhance mobile UX with in-app browser detection
5. Add A/B testing for payment flows

---

## Support & Troubleshooting

### Common Issues

**Issue**: QR Code Not Displaying
- **Solution**: Check qrcode.react is installed, verify API returns qrCodeUrl

**Issue**: Mobile Deep Link Doesn't Work
- **Solution**: Verify redirectUrl in API response, check GCash app installed

**Issue**: Payment Status Not Updating
- **Solution**: Check webhook endpoint, verify database connection

**Issue**: Build Fails
- **Solution**: Run `npm install`, check for missing dependencies

### Debug Mode

Enable debug logging in component:

```typescript
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true';

if (DEBUG) {
  console.log('GCash Payment Data:', checkoutData);
  console.log('User Agent:', navigator.userAgent);
  console.log('Is Mobile:', isMobile);
}
```

---

**Document Version**: 1.0.0
**Last Updated**: February 7, 2026
**Status**: Ready for Testing
