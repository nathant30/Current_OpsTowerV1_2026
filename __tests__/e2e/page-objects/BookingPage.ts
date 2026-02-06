/**
 * Booking Page Object Model
 * Encapsulates passenger booking flow interactions
 */

import { Page, expect, Locator } from '@playwright/test';
import { TestLocation } from '../fixtures/test-locations';

export class BookingPage {
  readonly page: Page;

  // Locators
  readonly pickupInput: Locator;
  readonly dropoffInput: Locator;
  readonly vehicleTypeButtons: Locator;
  readonly fareEstimate: Locator;
  readonly confirmBookingButton: Locator;
  readonly cancelBookingButton: Locator;
  readonly bookingDetails: Locator;
  readonly driverInfo: Locator;
  readonly rideStatus: Locator;
  readonly paymentMethodSelect: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.pickupInput = page.locator('input[name="pickup"], input[placeholder*="pickup" i], [data-testid="pickup-input"]');
    this.dropoffInput = page.locator('input[name="dropoff"], input[placeholder*="destination" i], [data-testid="dropoff-input"]');
    this.vehicleTypeButtons = page.locator('[data-testid^="vehicle-"], .vehicle-type-button');
    this.fareEstimate = page.locator('[data-testid="fare-estimate"], .fare-estimate');
    this.confirmBookingButton = page.locator('button:has-text("Confirm Booking"), button:has-text("Book Now"), [data-testid="confirm-booking"]');
    this.cancelBookingButton = page.locator('button:has-text("Cancel Booking"), button:has-text("Cancel"), [data-testid="cancel-booking"]');
    this.bookingDetails = page.locator('[data-testid="booking-details"], .booking-details');
    this.driverInfo = page.locator('[data-testid="driver-info"], .driver-info');
    this.rideStatus = page.locator('[data-testid*="ride-status"], .ride-status');
    this.paymentMethodSelect = page.locator('select[name="paymentMethod"], [data-testid="payment-method-select"]');
  }

  /**
   * Navigate to booking page
   */
  async goto(): Promise<void> {
    await this.page.goto('/book');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Enter pickup location
   */
  async enterPickupLocation(location: string | TestLocation): Promise<void> {
    const address = typeof location === 'string' ? location : location.address;

    await this.pickupInput.click();
    await this.pickupInput.fill(address);
    await this.page.waitForTimeout(500); // Wait for autocomplete

    // Select first suggestion if available
    const suggestion = this.page.locator('.location-suggestion, [role="option"]').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    } else {
      // If no suggestions, just press Enter
      await this.pickupInput.press('Enter');
    }

    await this.page.waitForTimeout(300);
  }

  /**
   * Enter dropoff location
   */
  async enterDropoffLocation(location: string | TestLocation): Promise<void> {
    const address = typeof location === 'string' ? location : location.address;

    await this.dropoffInput.click();
    await this.dropoffInput.fill(address);
    await this.page.waitForTimeout(500); // Wait for autocomplete

    // Select first suggestion if available
    const suggestion = this.page.locator('.location-suggestion, [role="option"]').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    } else {
      await this.dropoffInput.press('Enter');
    }

    await this.page.waitForTimeout(300);
  }

  /**
   * Select vehicle type
   */
  async selectVehicleType(type: 'sedan' | 'suv' | 'premium' | 'budget'): Promise<void> {
    const vehicleButton = this.page.locator(`[data-testid="vehicle-${type}"], button:has-text("${type}" i)`);
    await vehicleButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get displayed fare estimate
   */
  async getFareEstimate(): Promise<number | null> {
    if (!await this.fareEstimate.isVisible({ timeout: 2000 })) {
      return null;
    }

    const fareText = await this.fareEstimate.textContent();
    if (!fareText) return null;

    // Extract number from fare text (e.g., "₱120" -> 120)
    const match = fareText.match(/[\d,]+/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  }

  /**
   * Select payment method
   */
  async selectPaymentMethod(method: 'cash' | 'gcash' | 'maya' | 'card'): Promise<void> {
    // Try select dropdown first
    if (await this.paymentMethodSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.paymentMethodSelect.selectOption(method);
    } else {
      // Try button/radio selection
      const paymentButton = this.page.locator(
        `[data-testid="payment-${method}"], button:has-text("${method}" i), input[value="${method}"]`
      );
      await paymentButton.click();
    }
    await this.page.waitForTimeout(300);
  }

  /**
   * Confirm booking
   */
  async confirmBooking(timeout: number = 30000): Promise<void> {
    await this.confirmBookingButton.click();

    // Wait for booking confirmation
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for driver match
   */
  async waitForDriverMatch(timeout: number = 60000): Promise<void> {
    await expect(this.driverInfo).toBeVisible({ timeout });
  }

  /**
   * Get driver information
   */
  async getDriverInfo(): Promise<{ name: string; rating?: number; vehicle?: string }> {
    await this.driverInfo.waitFor({ state: 'visible', timeout: 5000 });

    const driverName = await this.page.locator('[data-testid="driver-name"], .driver-name').textContent();

    let rating: number | undefined;
    const ratingElement = this.page.locator('[data-testid="driver-rating"], .driver-rating');
    if (await ratingElement.isVisible().catch(() => false)) {
      const ratingText = await ratingElement.textContent();
      rating = ratingText ? parseFloat(ratingText) : undefined;
    }

    let vehicle: string | undefined;
    const vehicleElement = this.page.locator('[data-testid="vehicle-info"], .vehicle-info');
    if (await vehicleElement.isVisible().catch(() => false)) {
      vehicle = await vehicleElement.textContent() || undefined;
    }

    return {
      name: driverName || 'Unknown Driver',
      rating,
      vehicle
    };
  }

  /**
   * Get current ride status
   */
  async getRideStatus(): Promise<string> {
    if (!await this.rideStatus.isVisible({ timeout: 2000 })) {
      return 'unknown';
    }

    const statusText = await this.rideStatus.textContent();
    return statusText?.toLowerCase().trim() || 'unknown';
  }

  /**
   * Cancel booking
   */
  async cancelBooking(): Promise<void> {
    await this.cancelBookingButton.click();

    // Confirm cancellation in modal if present
    const confirmButton = this.page.locator('button:has-text("Yes"), button:has-text("Confirm")').first();
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for ride to complete
   */
  async waitForRideCompletion(timeout: number = 120000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const statusElement = document.querySelector('[data-testid*="ride-status"], .ride-status');
        return statusElement?.textContent?.toLowerCase().includes('completed') || false;
      },
      { timeout }
    );
  }

  /**
   * Rate the ride
   */
  async rateRide(stars: 1 | 2 | 3 | 4 | 5, feedback?: string): Promise<void> {
    // Wait for rating modal/page
    await this.page.waitForSelector('[data-testid*="rating"], .rating-stars', { timeout: 10000 });

    // Click on star rating
    const starButton = this.page.locator(`[data-testid="star-${stars}"], .star-${stars}, button[value="${stars}"]`);
    await starButton.click();

    // Add feedback if provided
    if (feedback) {
      const feedbackInput = this.page.locator('textarea[name="feedback"], textarea[placeholder*="feedback" i]');
      if (await feedbackInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await feedbackInput.fill(feedback);
      }
    }

    // Submit rating
    const submitButton = this.page.locator('button:has-text("Submit"), button:has-text("Send Rating")');
    await submitButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * View booking receipt
   */
  async viewReceipt(): Promise<boolean> {
    const receiptButton = this.page.locator('button:has-text("View Receipt"), a:has-text("Receipt")');

    if (await receiptButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await receiptButton.click();
      await this.page.waitForTimeout(1000);

      const receipt = this.page.locator('[data-testid="ride-receipt"], .receipt');
      return await receipt.isVisible();
    }

    // Receipt might already be displayed
    const receipt = this.page.locator('[data-testid="ride-receipt"], .receipt');
    return await receipt.isVisible();
  }

  /**
   * Get receipt details
   */
  async getReceiptDetails(): Promise<{
    fare: number | null;
    date: string | null;
    driver: string | null;
    payment: string | null;
  }> {
    const receipt = this.page.locator('[data-testid="ride-receipt"], .receipt');
    await receipt.waitFor({ state: 'visible', timeout: 5000 });

    // Extract fare
    let fare: number | null = null;
    const fareElement = this.page.locator('[data-testid="receipt-fare"], .receipt-fare, .total-fare');
    if (await fareElement.isVisible().catch(() => false)) {
      const fareText = await fareElement.textContent();
      const match = fareText?.match(/[\d,]+/);
      fare = match ? parseFloat(match[0].replace(/,/g, '')) : null;
    }

    // Extract date
    const dateElement = this.page.locator('[data-testid="receipt-date"], .receipt-date');
    const date = await dateElement.isVisible().catch(() => false)
      ? await dateElement.textContent()
      : null;

    // Extract driver name
    const driverElement = this.page.locator('[data-testid="receipt-driver"], .receipt-driver');
    const driver = await driverElement.isVisible().catch(() => false)
      ? await driverElement.textContent()
      : null;

    // Extract payment method
    const paymentElement = this.page.locator('[data-testid="receipt-payment"], .receipt-payment');
    const payment = await paymentElement.isVisible().catch(() => false)
      ? await paymentElement.textContent()
      : null;

    return { fare, date, driver, payment };
  }

  /**
   * Complete full booking flow
   */
  async createBooking(
    pickup: string | TestLocation,
    dropoff: string | TestLocation,
    vehicleType: 'sedan' | 'suv' | 'premium' | 'budget' = 'sedan',
    paymentMethod: 'cash' | 'gcash' | 'maya' | 'card' = 'cash'
  ): Promise<void> {
    await this.enterPickupLocation(pickup);
    await this.enterDropoffLocation(dropoff);
    await this.selectVehicleType(vehicleType);
    await this.selectPaymentMethod(paymentMethod);

    // Wait for fare estimate to appear
    await expect(this.fareEstimate).toBeVisible({ timeout: 10000 });

    await this.confirmBooking();
  }
}
