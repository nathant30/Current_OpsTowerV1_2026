# OpsTower E2E Test Suite

Comprehensive end-to-end testing suite for the OpsTower ridesharing platform using Playwright.

## Overview

This test suite provides complete E2E coverage for critical user workflows in the OpsTower platform, including passenger bookings, driver workflows, payment processing, admin operations, and real-time features.

**Test Coverage**: 30+ E2E tests covering >80% of critical paths

## Table of Contents

- [Test Structure](#test-structure)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Suites](#test-suites)
- [Page Objects](#page-objects)
- [Test Fixtures](#test-fixtures)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Test Structure

```
__tests__/e2e/
├── fixtures/
│   ├── test-users.ts          # Test user data for all roles
│   └── test-locations.ts      # Manila locations and routes
├── page-objects/
│   └── BookingPage.ts         # Page object for booking flows
├── utils/
│   └── auth-helpers.ts        # Authentication utilities
├── passenger-booking-flow.spec.ts  # Passenger E2E tests
├── driver-workflow.spec.ts         # Driver E2E tests
├── payment-flows.spec.ts           # Payment E2E tests
├── auth-flow.spec.ts               # Authentication tests
├── emergency-workflows.spec.ts     # Emergency system tests
└── global-setup.ts                 # Test environment setup
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Playwright installed: `npm install`

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Setup

Create `.env.test` file:

```env
BASE_URL=http://localhost:4000
DATABASE_URL=postgresql://user:pass@localhost:5432/opstower_test
REDIS_URL=redis://localhost:6379
```

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test Suite

```bash
# Passenger booking tests
npx playwright test passenger-booking-flow

# Driver workflow tests
npx playwright test driver-workflow

# Payment flow tests
npx playwright test payment-flows

# Authentication tests
npx playwright test auth-flow

# Emergency workflow tests
npx playwright test emergency-workflows
```

### Run with UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Specific Test

```bash
npx playwright test passenger-booking-flow.spec.ts -g "should complete full booking flow"
```

### Run in Debug Mode

```bash
npx playwright test --debug
```

## Test Suites

### 1. Passenger Booking Flow (8 tests)

**File**: `passenger-booking-flow.spec.ts`

**Coverage**:
- Full booking flow with cash payment
- GCash payment booking
- Maya payment booking
- Booking cancellation
- Fare estimates for different vehicle types
- Field validation
- Booking data persistence
- Multi-stop bookings (if supported)
- Booking history
- Profile management
- Error handling

**Key Scenarios**:
```typescript
test('should complete full booking flow with cash payment', async ({ page }) => {
  // Login → Enter locations → Select vehicle → Confirm → Wait for driver match
});

test('should complete booking flow with GCash payment', async ({ page }) => {
  // End-to-end GCash payment integration
});
```

### 2. Driver Workflow (6 tests)

**File**: `driver-workflow.spec.ts`

**Coverage**:
- Go online/offline
- Accept ride requests
- Complete ride flow
- View earnings
- View trip history
- Update vehicle information
- Driver registration
- Location sharing

**Key Scenarios**:
```typescript
test('driver can go online and accept ride requests', async ({ page }) => {
  // Login → Go online → Wait for ride → Accept → Complete
});

test('driver can view earnings summary', async ({ page }) => {
  // Navigate to earnings → Verify earnings display
});
```

### 3. Payment Flows (8 tests)

**File**: `payment-flows.spec.ts`

**Coverage**:
- GCash payment (success/failure)
- Maya payment (success/failure)
- Cash payment recording
- Payment history
- Payment receipts
- Refund requests
- Payment timeout handling
- Network error handling
- Payment method switching

**Key Scenarios**:
```typescript
test('should initiate GCash payment successfully', async ({ page }) => {
  // Select GCash → Enter mobile → Initiate payment
});

test('should handle payment failure callback', async ({ page }) => {
  // Simulate failure → Verify error handling → Show retry option
});
```

### 4. Authentication Flow (20+ tests)

**File**: `auth-flow.spec.ts`

**Coverage**:
- Login (valid/invalid credentials)
- Token refresh mechanism
- Role-based route guards
- Session management
- Multi-tab sessions
- Logout functionality
- MFA handling

**Key Scenarios**:
```typescript
test('should successfully login and redirect to dashboard', async ({ page }) => {
  // Enter credentials → Submit → Verify token → Check redirect
});

test('should automatically refresh expired token', async ({ page }) => {
  // Set expired token → Navigate → Verify refresh → Check new token
});
```

### 5. Emergency Workflows (12 tests)

**File**: `emergency-workflows.spec.ts`

**Coverage**:
- SOS alert triggering
- Emergency response
- Operator acknowledgment
- Real-time broadcasting
- Multi-user emergency handling
- Communication during emergency
- Emergency escalation
- System performance under load
- Failover and recovery
- Accessibility features

## Page Objects

### BookingPage

Encapsulates passenger booking flow interactions.

```typescript
import { BookingPage } from './page-objects/BookingPage';

const bookingPage = new BookingPage(page);
await bookingPage.goto();
await bookingPage.enterPickupLocation(location);
await bookingPage.enterDropoffLocation(location);
await bookingPage.selectVehicleType('sedan');
await bookingPage.confirmBooking();
```

**Methods**:
- `goto()` - Navigate to booking page
- `enterPickupLocation(location)` - Enter pickup
- `enterDropoffLocation(location)` - Enter dropoff
- `selectVehicleType(type)` - Select vehicle
- `selectPaymentMethod(method)` - Select payment
- `confirmBooking()` - Confirm booking
- `waitForDriverMatch()` - Wait for driver
- `getDriverInfo()` - Get driver details
- `getRideStatus()` - Get current status
- `cancelBooking()` - Cancel booking
- `rateRide(stars, feedback)` - Rate completed ride

## Test Fixtures

### Test Users

Located in `fixtures/test-users.ts`

**Available Users**:
```typescript
import { testPassengers, testDrivers, testAdmins } from './fixtures/test-users';

const passenger = testPassengers[0]; // Juan Dela Cruz
const driver = testDrivers[0];       // Carlo Garcia
const admin = testAdmins[0];         // Admin User
```

**User Roles**:
- Passengers (3 users) - Different payment methods
- Drivers (3 users) - Different vehicles
- Admins (2 users)
- Operators (2 users)
- Safety Monitors (1 user)
- Regional Managers (1 user)
- Analysts (1 user)

### Test Locations

Located in `fixtures/test-locations.ts`

**Popular Locations**:
```typescript
import { testLocations, testRoutes } from './fixtures/test-locations';

// Use predefined locations
const pickup = testLocations[0]; // Glorietta Mall
const dropoff = testLocations[2]; // BGC High Street

// Use predefined routes
const route = testRoutes[0]; // Short city ride: Makati to BGC
await bookingPage.createBooking(route.pickup, route.dropoff);
```

**Available Routes**:
- Short city ride (Makati → BGC)
- Medium city ride (QC → Makati)
- Airport transfer (BGC → NAIA T3)
- Mall to mall (MOA → Megamall)
- Tourist route (Intramuros → Rizal Park)

## Best Practices

### 1. Use Page Objects

✅ **Good**:
```typescript
const bookingPage = new BookingPage(page);
await bookingPage.createBooking(pickup, dropoff);
```

❌ **Bad**:
```typescript
await page.click('#pickup-input');
await page.fill('#pickup-input', 'Makati');
// Brittle, hard to maintain
```

### 2. Use Test Fixtures

✅ **Good**:
```typescript
const passenger = testPassengers[0];
await loginAsUser(page, passenger);
```

❌ **Bad**:
```typescript
await page.fill('input[name="email"]', 'juan@test.com');
await page.fill('input[name="password"]', 'password123');
```

### 3. Use data-testid Attributes

✅ **Good**:
```typescript
await page.locator('[data-testid="confirm-booking"]').click();
```

❌ **Bad**:
```typescript
await page.click('.button.primary.large'); // Brittle CSS selectors
```

### 4. Handle Async Operations

✅ **Good**:
```typescript
await expect(bookingPage.fareEstimate).toBeVisible({ timeout: 5000 });
await bookingPage.waitForDriverMatch(30000);
```

❌ **Bad**:
```typescript
await page.waitForTimeout(5000); // Arbitrary waits slow tests
```

### 5. Cleanup After Tests

```typescript
test.beforeEach(async ({ page }) => {
  await clearAuthTokens(page);
});

test.afterEach(async ({ page }) => {
  // Cleanup test data if needed
});
```

## Authentication Helpers

Located in `utils/auth-helpers.ts`

### Login

```typescript
import { loginAsUser, login } from './utils/auth-helpers';

// Login with user object
const passenger = testPassengers[0];
await loginAsUser(page, passenger);

// Login with credentials
await login(page, 'user@test.com', 'password123');
```

### Logout

```typescript
import { logout, clearAuthTokens } from './utils/auth-helpers';

await logout(page);
// Or forcefully clear tokens
await clearAuthTokens(page);
```

### Check Authentication

```typescript
import { isAuthenticated, getAuthToken } from './utils/auth-helpers';

const authenticated = await isAuthenticated(page);
const token = await getAuthToken(page);
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:4000

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Reports

After running tests, view HTML report:

```bash
npx playwright show-report
```

Reports are generated in `playwright-report/` directory.

## Troubleshooting

### Tests Timing Out

**Issue**: Tests fail with timeout errors

**Solution**:
```typescript
// Increase timeout for specific test
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // Test code
});

// Or increase global timeout in playwright.config.ts
timeout: 60 * 1000, // 60 seconds
```

### Authentication Failures

**Issue**: Tests fail at login

**Solution**:
```typescript
// Clear tokens before each test
test.beforeEach(async ({ page }) => {
  await clearAuthTokens(page);
});

// Verify credentials in fixtures
const passenger = testPassengers[0];
console.log('Email:', passenger.email);
console.log('Password:', passenger.password);
```

### Flaky Tests

**Issue**: Tests pass sometimes but fail randomly

**Solution**:
```typescript
// Use proper waits
await expect(element).toBeVisible({ timeout: 5000 });

// Wait for network idle
await page.waitForLoadState('networkidle');

// Avoid arbitrary timeouts
// ❌ await page.waitForTimeout(1000);
// ✅ await expect(element).toBeVisible();
```

### Element Not Found

**Issue**: Cannot find element on page

**Solution**:
```typescript
// Use flexible selectors
const button = page.locator(
  'button:has-text("Confirm"),' +
  '[data-testid="confirm-button"],' +
  '.confirm-button'
);

// Check if element exists first
if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
  await button.click();
}
```

### Database State Issues

**Issue**: Tests fail due to database state

**Solution**:
```bash
# Reset database before tests
npm run db:reset:test

# Or use test transactions (rollback after each test)
```

## Test Data Management

### Creating Test Data

```typescript
// Create test data via API
await page.request.post('/api/test/create-driver', {
  data: testDrivers[0]
});

// Or use database seeding
// See global-setup.ts
```

### Cleaning Up Test Data

```typescript
test.afterEach(async ({ page }) => {
  // Clean up via API
  await page.request.delete('/api/test/cleanup');
});
```

## Performance Testing

For performance regression tests, see:
- `__tests__/load/` - Load testing with various scenarios
- Performance benchmarks documented in monitoring setup

## Contributing

### Adding New Tests

1. Create new test file in `__tests__/e2e/`
2. Import necessary fixtures and helpers
3. Follow naming convention: `feature-name.spec.ts`
4. Add documentation to this README

### Updating Page Objects

1. Update page object class in `page-objects/`
2. Add JSDoc comments for new methods
3. Update README with usage examples

### Adding Test Fixtures

1. Add new fixtures to `fixtures/` directory
2. Export from appropriate file
3. Document in README

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [OpsTower API Documentation](../../API_DOCUMENTATION.md)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review existing tests for examples
- Consult Playwright documentation
- Ask in project Slack channel

---

**Last Updated**: 2026-02-07
**Maintained By**: QA Team
**Test Coverage**: 30+ E2E tests | 80%+ critical path coverage
