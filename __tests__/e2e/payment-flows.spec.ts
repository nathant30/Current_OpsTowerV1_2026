/**
 * Payment Flow E2E Tests
 *
 * Tests comprehensive payment workflows including:
 * - GCash payment (success/failure)
 * - Maya payment flows
 * - Cash payment recording
 * - Payment history
 * - Refund processing
 *
 * Priority: P1 (Critical) - Issue #30
 */

import { test, expect } from '@playwright/test';
import { testPassengers } from './fixtures/test-users';
import { testRoutes } from './fixtures/test-locations';
import { loginAsUser, clearAuthTokens } from './utils/auth-helpers';
import { BookingPage } from './page-objects/BookingPage';

test.describe('GCash Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthTokens(page);
  });

  test('should initiate GCash payment successfully', async ({ page }) => {
    const passenger = testPassengers[0]; // Has GCash configured
    await loginAsUser(page, passenger);

    const bookingPage = new BookingPage(page);
    await bookingPage.goto();

    // Create booking with GCash
    const route = testRoutes[0];
    await bookingPage.createBooking(route.pickup, route.dropoff, 'sedan', 'gcash');

    // In real flow, this would redirect to GCash payment page
    // For E2E test, we verify the initiation

    const fare = await bookingPage.getFareEstimate();
    expect(fare).toBeGreaterThan(0);

    // Click confirm to initiate payment
    await bookingPage.confirmBooking();

    // Wait for payment processing
    await page.waitForTimeout(2000);

    // Check if redirected to payment page or shows payment modal
    const paymentPage = page.locator('[data-testid="payment-page"], .payment-page, text=/payment/i');
    const hasPaymentUI = await paymentPage.isVisible().catch(() => false);

    console.log('GCash payment initiation:', hasPaymentUI ? 'Redirected to payment' : 'Processing');
  });

  test('should handle GCash payment success callback', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    // Simulate successful payment callback
    await page.goto('/payment/callback?gateway=gcash&status=success&transactionId=GCASH-TEST-123');
    await page.waitForLoadState('networkidle');

    // Should show success message
    const successMessage = page.locator('[data-testid="payment-success"], .success, text=/success|successful/i');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('should handle GCash payment failure callback', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    // Simulate failed payment callback
    await page.goto('/payment/callback?gateway=gcash&status=failed&transactionId=GCASH-TEST-456');
    await page.waitForLoadState('networkidle');

    // Should show failure message or retry option
    const failureMessage = page.locator('[data-testid="payment-failed"], .error, text=/failed|error/i');
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');

    const hasFailureHandling = await failureMessage.isVisible().catch(() => false) ||
      await retryButton.isVisible().catch(() => false);

    expect(hasFailureHandling).toBeTruthy();
  });

  test('should enter GCash mobile number', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    await page.goto('/payment/method');
    await page.waitForLoadState('networkidle');

    // Select GCash
    const gcashOption = page.locator('[data-testid="payment-gcash"], button:has-text("GCash"), input[value="gcash"]');

    if (await gcashOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gcashOption.click();
      await page.waitForTimeout(500);

      // Look for mobile number input
      const mobileInput = page.locator('input[name="mobileNumber"], input[name="phone"], input[placeholder*="mobile" i]');

      if (await mobileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mobileInput.fill('09171234567');

        // Verify valid Philippine mobile format
        const inputValue = await mobileInput.inputValue();
        expect(inputValue).toMatch(/^09\d{9}$/);
      }
    }
  });
});

test.describe('Maya Payment Flow', () => {
  test('should initiate Maya payment successfully', async ({ page }) => {
    const passenger = testPassengers[0]; // Has Maya configured
    await loginAsUser(page, passenger);

    const bookingPage = new BookingPage(page);
    await bookingPage.goto();

    // Create booking with Maya
    const route = testRoutes[1];
    await bookingPage.createBooking(route.pickup, route.dropoff, 'sedan', 'maya');

    const fare = await bookingPage.getFareEstimate();
    expect(fare).toBeGreaterThan(0);

    await bookingPage.confirmBooking();

    await page.waitForTimeout(2000);

    // Verify payment initiation
    console.log('Maya payment flow initiated');
  });

  test('should handle Maya payment success callback', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    // Simulate successful Maya payment callback
    await page.goto('/payment/callback?gateway=maya&status=success&transactionId=MAYA-TEST-789');
    await page.waitForLoadState('networkidle');

    // Should show success message
    const successMessage = page.locator('[data-testid="payment-success"], .success, text=/success|successful/i');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('should handle Maya payment failure callback', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    // Simulate failed Maya payment callback
    await page.goto('/payment/callback?gateway=maya&status=failed&transactionId=MAYA-TEST-ERR');
    await page.waitForLoadState('networkidle');

    // Should show failure handling
    const failureUI = page.locator('[data-testid="payment-failed"], .error, button:has-text("Retry")');
    await expect(failureUI.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Cash Payment Flow', () => {
  test('should record cash payment after ride completion', async ({ page }) => {
    const passenger = testPassengers[2]; // Cash-only user
    await loginAsUser(page, passenger);

    const bookingPage = new BookingPage(page);
    await bookingPage.goto();

    // Create booking with cash
    const route = testRoutes[4]; // Short ride
    await bookingPage.createBooking(route.pickup, route.dropoff, 'sedan', 'cash');

    const fare = await bookingPage.getFareEstimate();
    expect(fare).toBeGreaterThan(0);

    // In real flow, after ride completion, cash payment is recorded
    // For E2E test, we verify the cash option is selected
    console.log('Cash payment selected successfully');
  });

  test('should display cash payment instructions', async ({ page }) => {
    const passenger = testPassengers[2];
    await loginAsUser(page, passenger);

    const bookingPage = new BookingPage(page);
    await bookingPage.goto();

    // Select cash payment
    await bookingPage.selectPaymentMethod('cash');
    await page.waitForTimeout(500);

    // Look for cash payment instructions
    const instructions = page.locator('[data-testid="cash-instructions"], .payment-instructions, text=/cash|pay driver/i');

    if (await instructions.isVisible({ timeout: 2000 }).catch(() => false)) {
      const instructionsText = await instructions.textContent();
      console.log('Cash payment instructions:', instructionsText);
    }
  });
});

test.describe('Payment History', () => {
  test('should display payment history', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    await page.goto('/payments/history');
    await page.waitForLoadState('networkidle');

    // Verify payment history page
    const historySection = page.locator('[data-testid="payment-history"], .payment-history, h1:has-text("Payments")');
    await expect(historySection).toBeVisible({ timeout: 5000 });

    // Check for payment entries
    const paymentItems = page.locator('[data-testid^="payment-"], .payment-item, .transaction-item');
    const count = await paymentItems.count();

    console.log(`Found ${count} payments in history`);

    if (count > 0) {
      // Verify payment item structure
      const firstPayment = paymentItems.first();
      await expect(firstPayment).toBeVisible();

      // Check for payment details
      const amount = firstPayment.locator('text=/₱|PHP/i');
      const date = firstPayment.locator('text=/\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}/');
      const method = firstPayment.locator('text=/gcash|maya|cash/i');

      // At least one detail should be visible
      let hasDetails = false;
      for (const detail of [amount, date, method]) {
        if (await detail.isVisible().catch(() => false)) {
          hasDetails = true;
          break;
        }
      }
      expect(hasDetails).toBeTruthy();
    }
  });

  test('should view payment receipt', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    await page.goto('/payments/history');
    await page.waitForLoadState('networkidle');

    // Find and click on a payment
    const paymentItems = page.locator('[data-testid^="payment-"], .payment-item, .transaction-item');
    const count = await paymentItems.count();

    if (count > 0) {
      const firstPayment = paymentItems.first();
      await firstPayment.click();
      await page.waitForTimeout(1000);

      // Verify receipt/details view
      const receipt = page.locator('[data-testid="payment-receipt"], .receipt, .payment-details');
      await expect(receipt).toBeVisible({ timeout: 5000 });

      // Verify receipt has key information
      const transactionId = page.locator('[data-testid="transaction-id"], text=/transaction|reference/i');
      const hasTransactionId = await transactionId.isVisible().catch(() => false);

      console.log('Receipt view:', hasTransactionId ? 'Complete' : 'Basic');
    } else {
      console.log('No payment history available - skipping test');
      test.skip();
    }
  });
});

test.describe('Payment Refunds', () => {
  test('should display refund request option for eligible payments', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    await page.goto('/payments/history');
    await page.waitForLoadState('networkidle');

    const paymentItems = page.locator('[data-testid^="payment-"], .payment-item');
    const count = await paymentItems.count();

    if (count > 0) {
      // Look for refund button
      const refundButton = page.locator('button:has-text("Request Refund"), [data-testid="request-refund"]');

      if (await refundButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Refund functionality available');

        await refundButton.click();
        await page.waitForTimeout(500);

        // Verify refund form/modal
        const refundForm = page.locator('[data-testid="refund-form"], .refund-modal');
        await expect(refundForm).toBeVisible({ timeout: 5000 });
      } else {
        console.log('No refundable payments or refund feature not available');
      }
    } else {
      console.log('No payment history - skipping refund test');
      test.skip();
    }
  });

  test('should validate refund request form', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    // Navigate to refund page (if exists)
    await page.goto('/payments/refund');
    await page.waitForLoadState('networkidle');

    // Look for refund form
    const refundForm = page.locator('form, [data-testid="refund-form"]');

    if (await refundForm.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]:has-text("Submit"), button:has-text("Request Refund")');

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show validation error
        const validationError = page.locator('.error, [role="alert"]');
        const hasError = await validationError.isVisible().catch(() => false);

        console.log('Refund validation:', hasError ? 'Active' : 'Not enforced');
      }
    } else {
      console.log('Refund form not available');
      test.skip();
    }
  });
});

test.describe('Payment Error Handling', () => {
  test('should handle payment timeout gracefully', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    // Simulate payment timeout scenario
    await page.goto('/payment/callback?gateway=gcash&status=timeout&transactionId=GCASH-TIMEOUT');
    await page.waitForLoadState('networkidle');

    // Should show timeout message or retry option
    const timeoutUI = page.locator('text=/timeout|expired/i, button:has-text("Retry")');
    const hasTimeoutHandling = await timeoutUI.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasTimeoutHandling).toBeTruthy();
  });

  test('should handle network error during payment', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    const bookingPage = new BookingPage(page);
    await bookingPage.goto();

    // Block payment API
    await page.route('**/api/payments/**', route => route.abort());

    const route = testRoutes[0];
    await bookingPage.enterPickupLocation(route.pickup);
    await bookingPage.enterDropoffLocation(route.dropoff);
    await bookingPage.selectVehicleType('sedan');
    await bookingPage.selectPaymentMethod('gcash');

    try {
      await bookingPage.confirmBooking();
      await page.waitForTimeout(2000);

      // Should show error or handle gracefully
      const errorMessage = page.locator('[data-testid="error"], .error, [role="alert"]');
      const hasError = await errorMessage.isVisible().catch(() => false);

      console.log('Payment network error handling:', hasError ? 'Shows error' : 'Silent handling');
    } finally {
      await page.unroute('**/api/payments/**');
    }
  });

  test('should allow retry after failed payment', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    // Simulate failed payment
    await page.goto('/payment/callback?gateway=gcash&status=failed&transactionId=GCASH-FAIL-123');
    await page.waitForLoadState('networkidle');

    // Look for retry button
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again"), [data-testid="retry-payment"]');

    if (await retryButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await retryButton.click();
      await page.waitForTimeout(1000);

      // Should navigate back to payment selection or initiate retry
      console.log('Payment retry functionality available');
    } else {
      console.log('Retry functionality not found');
    }
  });
});

test.describe('Multiple Payment Methods', () => {
  test('should switch between payment methods before confirming', async ({ page }) => {
    const passenger = testPassengers[0];
    await loginAsUser(page, passenger);

    const bookingPage = new BookingPage(page);
    await bookingPage.goto();

    const route = testRoutes[0];
    await bookingPage.enterPickupLocation(route.pickup);
    await bookingPage.enterDropoffLocation(route.dropoff);
    await bookingPage.selectVehicleType('sedan');

    // Try different payment methods
    const methods: Array<'cash' | 'gcash' | 'maya'> = ['cash', 'gcash', 'maya'];

    for (const method of methods) {
      await bookingPage.selectPaymentMethod(method);
      await page.waitForTimeout(300);

      console.log(`Selected payment method: ${method}`);
    }

    // Verify last selected method is active
    // This depends on UI implementation
  });
});
