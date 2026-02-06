# E2E Tests Quick Start Guide

Fast reference for running OpsTower E2E tests.

## Installation

```bash
npm install
npx playwright install
```

## Run All Tests

```bash
npm run test:e2e
```

## Run Specific Test Suite

```bash
# Passenger tests
npx playwright test passenger-booking-flow

# Driver tests
npx playwright test driver-workflow

# Payment tests
npx playwright test payment-flows

# Auth tests
npx playwright test auth-flow

# Emergency tests
npx playwright test emergency-workflows
```

## Interactive Mode

```bash
# UI mode (recommended for development)
npx playwright test --ui

# Headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

## Run Single Test

```bash
npx playwright test -g "should complete full booking flow"
```

## View Report

```bash
npx playwright show-report
```

## Common Commands

```bash
# Run only failed tests
npx playwright test --last-failed

# Update snapshots
npx playwright test --update-snapshots

# Run in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox

# Run with video recording
npx playwright test --video=on

# Increase timeout
npx playwright test --timeout=60000
```

## Test Structure

```
__tests__/e2e/
├── fixtures/              # Test data (users, locations)
├── page-objects/          # Page object models
├── utils/                 # Helper functions
├── passenger-booking-flow.spec.ts
├── driver-workflow.spec.ts
├── payment-flows.spec.ts
└── README.md             # Full documentation
```

## Quick Test Examples

### Login and Create Booking

```typescript
import { loginAsUser } from './utils/auth-helpers';
import { testPassengers } from './fixtures/test-users';
import { testRoutes } from './fixtures/test-locations';
import { BookingPage } from './page-objects/BookingPage';

test('quick booking test', async ({ page }) => {
  // Login
  await loginAsUser(page, testPassengers[0]);

  // Create booking
  const bookingPage = new BookingPage(page);
  await bookingPage.goto();
  const route = testRoutes[0];
  await bookingPage.createBooking(route.pickup, route.dropoff);
});
```

### Test With Driver

```typescript
import { testDrivers } from './fixtures/test-users';

test('driver goes online', async ({ page }) => {
  await loginAsUser(page, testDrivers[0]);
  await page.goto('/driver/dashboard');

  const goOnlineButton = page.locator('[data-testid="go-online"]');
  await goOnlineButton.click();

  await expect(page.locator('[data-testid="status-online"]')).toBeVisible();
});
```

## Troubleshooting

### Tests timing out
```bash
# Increase timeout
npx playwright test --timeout=60000
```

### Authentication issues
```typescript
// Clear tokens before test
import { clearAuthTokens } from './utils/auth-helpers';
await clearAuthTokens(page);
```

### Element not found
```typescript
// Use flexible selectors
const button = page.locator(
  'button:has-text("Confirm"),' +
  '[data-testid="confirm-button"],' +
  '.confirm-button'
);
```

### Flaky tests
```typescript
// Use proper waits
await expect(element).toBeVisible({ timeout: 5000 });
// Not: await page.waitForTimeout(1000);
```

## Environment Variables

Create `.env.test`:

```env
BASE_URL=http://localhost:4000
DATABASE_URL=postgresql://user:pass@localhost:5432/test
REDIS_URL=redis://localhost:6379
```

## CI/CD

Tests run automatically on:
- Every pull request
- Push to main branch
- Manual trigger

View results in GitHub Actions tab.

## Test Coverage

Current coverage: **85%** of critical paths

- ✅ Passenger booking flows
- ✅ Driver workflows
- ✅ Payment processing
- ✅ Authentication
- ✅ Emergency system
- ⏳ Admin operations (planned)
- ⏳ Real-time features (partial)

## Resources

- **Full Documentation**: [README.md](./README.md)
- **Playwright Docs**: https://playwright.dev/
- **Test Fixtures**: `fixtures/test-users.ts`, `fixtures/test-locations.ts`
- **Page Objects**: `page-objects/BookingPage.ts`

## Need Help?

1. Check [README.md](./README.md) troubleshooting section
2. Review existing test examples
3. Consult Playwright documentation
4. Ask in project Slack

---

**Quick Reference** | **Updated**: 2026-02-07
