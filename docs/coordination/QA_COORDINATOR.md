# QA Coordinator

## Role Overview

The QA Coordinator ensures OpsTower meets quality standards through systematic testing. You delegate to QA Agent (manual/exploratory testing) and Test Agent (automated testing) to validate functionality, reliability, and user experience.

## Responsibilities

### Primary Duties
- Create comprehensive test plans
- Execute test cases (manual and automated)
- Validate acceptance criteria
- Report and track defects
- Ensure test coverage
- Monitor quality metrics
- Validate releases

### Secondary Duties
- Collaborate with Development on testability
- Work with Product & Design on test scenarios
- Coordinate with Security on security testing
- Support Review on quality gates
- Help Docs & Git with testing documentation

## Sub-Agents

### QA Agent
**Specialization**: Manual testing, exploratory testing, user acceptance testing

**Delegate To When**:
- Manual test execution
- Exploratory testing
- Usability testing
- Cross-browser/device testing
- Edge case discovery
- User acceptance testing (UAT)

**Typical Tasks**:
- Execute manual test cases
- Perform exploratory testing sessions
- Test user workflows end-to-end
- Validate UI/UX across devices
- Identify edge cases
- Document reproduction steps for bugs

### Test Agent
**Specialization**: Test automation, test maintenance, test infrastructure

**Delegate To When**:
- Creating automated tests
- Maintaining test suites
- Setting up test infrastructure
- Running regression tests
- Performance testing
- Load testing

**Typical Tasks**:
- Write unit tests (Jest)
- Write integration tests
- Write E2E tests (Playwright)
- Set up test databases
- Configure CI/CD testing
- Maintain test fixtures

## Workflow

### Standard QA Workflow

```
1. Receive Assignment from Project Coordinator
   ↓
2. Read PROJECT_STATE.md for context
   ↓
3. Run npm run verify-project
   ↓
4. Review feature requirements and acceptance criteria
   ↓
5. Create test plan
   ↓
6. Delegate to Test Agent (automated tests) and QA Agent (manual testing)
   ↓
7. Execute tests and monitor results
   ↓
8. Document and report defects
   ↓
9. Validate fixes
   ↓
10. Update PROJECT_STATE.md
    ↓
11. Report completion to Project Coordinator
```

### Test Planning Process

```
1. Requirements Analysis
   - Review PRD and acceptance criteria
   - Identify test scenarios
   - Determine test scope
   - Identify dependencies

2. Test Design
   - Create test cases
   - Design test data
   - Plan test environments
   - Define pass/fail criteria

3. Test Implementation
   - Write automated tests
   - Prepare manual test scripts
   - Set up test data
   - Configure test environments

4. Test Execution
   - Run automated test suites
   - Execute manual test cases
   - Document results
   - Log defects

5. Defect Management
   - Report bugs with clear reproduction steps
   - Prioritize defects (Critical, High, Medium, Low)
   - Track to resolution
   - Verify fixes

6. Test Reporting
   - Document test coverage
   - Report quality metrics
   - Summarize findings
   - Provide go/no-go recommendation
```

## OpsTower Testing Priorities

### P1 - High Priority

#### Issue #25: End-to-End Tests
**Problem**: No comprehensive E2E test coverage

**Objective**: Create E2E tests for critical user flows using Playwright

**Test Scenarios**:

**1. Passenger Flow**:
```typescript
// __tests__/e2e/passenger-booking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Passenger Booking Flow', () => {
  test('passenger can book and complete a ride', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'passenger@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button:text("Login")');

    // Enter destination
    await page.goto('/book');
    await page.fill('[name="pickup"]', 'SM Mall of Asia, Pasay');
    await page.fill('[name="dropoff"]', 'NAIA Terminal 3, Pasay');

    // Select vehicle type
    await page.click('[data-testid="vehicle-sedan"]');

    // Review fare estimate
    await expect(page.locator('[data-testid="fare-estimate"]')).toBeVisible();

    // Confirm booking
    await page.click('button:text("Confirm Booking")');

    // Wait for driver match
    await expect(page.locator('[data-testid="driver-matched"]')).toBeVisible({ timeout: 30000 });

    // View driver details
    await expect(page.locator('[data-testid="driver-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="driver-rating"]')).toBeVisible();

    // Track ride in progress
    await expect(page.locator('[data-testid="ride-status-in-progress"]')).toBeVisible();

    // Complete ride (mock driver completing)
    // ... ride completion flow

    // Rate driver
    await page.click('[data-testid="star-5"]');
    await page.fill('[name="feedback"]', 'Great driver!');
    await page.click('button:text("Submit Rating")');

    // View receipt
    await expect(page.locator('[data-testid="ride-receipt"]')).toBeVisible();
  });

  test('passenger can cancel booking before driver accepts', async ({ page }) => {
    // ... cancellation flow
  });

  test('passenger can view ride history', async ({ page }) => {
    // ... ride history flow
  });
});
```

**2. Driver Flow**:
```typescript
// __tests__/e2e/driver-workflow.spec.ts
test.describe('Driver Workflow', () => {
  test('driver can accept and complete ride', async ({ page }) => {
    // Login as driver
    await page.goto('/login');
    await page.fill('[name="email"]', 'driver@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button:text("Login")');

    // Go online
    await page.click('[data-testid="go-online"]');
    await expect(page.locator('[data-testid="status-online"]')).toBeVisible();

    // Wait for ride request
    await expect(page.locator('[data-testid="ride-request"]')).toBeVisible({ timeout: 60000 });

    // Accept ride
    await page.click('button:text("Accept")');

    // Navigate to pickup
    await expect(page.locator('[data-testid="navigate-to-pickup"]')).toBeVisible();

    // Arrive at pickup
    await page.click('button:text("Arrived")');

    // Start ride
    await page.click('button:text("Start Ride")');

    // Navigate to destination
    await expect(page.locator('[data-testid="navigate-to-destination"]')).toBeVisible();

    // Complete ride
    await page.click('button:text("Complete Ride")');

    // View earnings
    await expect(page.locator('[data-testid="trip-earnings"]')).toBeVisible();
  });
});
```

**3. Payment Flow**:
```typescript
// __tests__/e2e/payment.spec.ts
test.describe('Payment Processing', () => {
  test('passenger can pay with GCash', async ({ page }) => {
    // ... complete booking

    // Select payment method
    await page.click('[data-testid="payment-gcash"]');

    // Enter GCash number
    await page.fill('[name="gcash-number"]', '09171234567');

    // Confirm payment
    await page.click('button:text("Pay Now")');

    // Redirect to GCash (mock)
    await expect(page.url()).toContain('gcash.com');

    // Complete payment (mock callback)
    await page.goto('/payment/callback?status=success');

    // Verify payment success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
  });

  test('passenger can pay with PayMaya', async ({ page }) => {
    // ... PayMaya flow
  });

  test('passenger can pay with cash', async ({ page }) => {
    // ... cash payment flow
  });
});
```

**4. Admin Flow**:
```typescript
// __tests__/e2e/admin.spec.ts
test.describe('Admin Operations', () => {
  test('admin can approve driver application', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    // ... admin authentication

    // View pending driver applications
    await page.goto('/admin/drivers/pending');
    await expect(page.locator('[data-testid="pending-driver"]').first()).toBeVisible();

    // Review application
    await page.click('[data-testid="review-application"]');

    // Verify documents
    await expect(page.locator('[data-testid="driver-license"]')).toBeVisible();
    await expect(page.locator('[data-testid="vehicle-registration"]')).toBeVisible();

    // Approve application
    await page.click('button:text("Approve")');

    // Verify approval
    await expect(page.locator('[data-testid="approval-success"]')).toBeVisible();
  });
});
```

**Acceptance Criteria**:
- [ ] All critical user flows have E2E tests
- [ ] Tests run in CI/CD pipeline
- [ ] Tests pass consistently (no flakiness)
- [ ] Test coverage > 80% for critical paths
- [ ] Tests run in < 10 minutes
- [ ] Documentation for running E2E tests

**Timeline**: 24-32 hours

---

#### Issue #20: Monitoring and Alerting (Testing Component)
**Problem**: Need to validate monitoring and alerting systems work correctly

**Testing Requirements**:
1. **Test Alert Triggers**:
   - Verify error rate alerts
   - Test performance degradation alerts
   - Validate security incident alerts
   - Test availability alerts

2. **Test Monitoring Data**:
   - Verify metrics collection
   - Validate log aggregation
   - Test dashboard accuracy
   - Validate real-time updates

3. **Test Incident Response**:
   - Verify on-call notifications
   - Test escalation procedures
   - Validate runbook accuracy
   - Test recovery procedures

**Timeline**: 8 hours

---

### P3 - Low Priority

#### Issue #32: Performance Regression Tests
**Problem**: Need automated performance testing to catch regressions

**Objective**: Create performance benchmarks and regression tests

**Test Scenarios**:

**1. API Performance Tests**:
```typescript
// __tests__/performance/api.test.ts
import { test, expect } from '@playwright/test';

test.describe('API Performance', () => {
  test('GET /api/rides should respond in < 200ms', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/api/rides');
    const duration = Date.now() - start;

    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(200);
  });

  test('POST /api/rides should handle 100 concurrent requests', async ({ request }) => {
    const requests = Array.from({ length: 100 }, () =>
      request.post('/api/rides', {
        data: {
          pickup: { lat: 14.5995, lng: 120.9842 },
          dropoff: { lat: 14.6091, lng: 121.0223 }
        }
      })
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    expect(responses.every(r => r.ok())).toBeTruthy();
    expect(duration).toBeLessThan(5000); // All requests in < 5s
  });
});
```

**2. Database Performance Tests**:
```typescript
// __tests__/performance/database.test.ts
test.describe('Database Performance', () => {
  test('ride query with joins should complete in < 100ms', async () => {
    const start = Date.now();

    await prisma.ride.findMany({
      where: { status: 'completed' },
      include: {
        driver: true,
        passenger: true,
        payment: true
      },
      take: 50
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

**3. Load Testing**:
```bash
# Using k6 for load testing
k6 run --vus 100 --duration 30s load-test.js
```

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  }
};

export default function () {
  let response = http.get('https://opstower.com/api/rides');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Timeline**: 16-20 hours

---

## Testing Standards

### Unit Tests (Jest)

**What to Test**:
- Individual functions and utilities
- React component rendering
- Component interactions
- Business logic
- Data transformations

**Example**:
```typescript
// __tests__/lib/fare-calculator.test.ts
import { calculateFare } from '@/lib/fare-calculator';

describe('Fare Calculator', () => {
  it('calculates base fare correctly', () => {
    const fare = calculateFare({
      distance: 5, // km
      duration: 15, // minutes
      vehicleType: 'sedan'
    });

    expect(fare.base).toBe(40); // ₱40 base fare
    expect(fare.distance).toBe(50); // ₱10/km * 5km
    expect(fare.time).toBe(15); // ₱1/min * 15min
    expect(fare.total).toBe(105);
  });

  it('applies surge pricing during peak hours', () => {
    const fare = calculateFare({
      distance: 5,
      duration: 15,
      vehicleType: 'sedan',
      isPeakHour: true
    });

    expect(fare.surge).toBe(1.5); // 1.5x multiplier
    expect(fare.total).toBe(157.5); // 105 * 1.5
  });

  it('throws error for invalid distance', () => {
    expect(() => {
      calculateFare({ distance: -5, duration: 15, vehicleType: 'sedan' });
    }).toThrow('Invalid distance');
  });
});
```

### Integration Tests

**What to Test**:
- API endpoints
- Database operations
- Service integrations
- Authentication flows

**Example**:
```typescript
// __tests__/api/rides/create.test.ts
import { POST } from '@/app/api/rides/route';
import { prisma } from '@/lib/db';
import { createMockRequest } from '@/test-utils';

describe('POST /api/rides', () => {
  beforeEach(async () => {
    // Clean up database
    await prisma.ride.deleteMany();
  });

  it('creates a ride request', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: {
        passengerId: 'passenger-123',
        pickup: { lat: 14.5995, lng: 120.9842, address: 'SM MOA' },
        dropoff: { lat: 14.6091, lng: 121.0223, address: 'NAIA T3' },
        vehicleType: 'sedan'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.rideId).toBeDefined();
    expect(data.status).toBe('pending');
    expect(data.fareEstimate).toBeDefined();

    // Verify database entry
    const ride = await prisma.ride.findUnique({
      where: { id: data.rideId }
    });
    expect(ride).toBeDefined();
    expect(ride.status).toBe('pending');
  });

  it('validates required fields', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: { passengerId: 'passenger-123' } // Missing required fields
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('validation');
  });
});
```

### E2E Tests (Playwright)

**What to Test**:
- Complete user workflows
- Cross-page interactions
- Real-time features
- Payment flows
- Error handling

**Best Practices**:
- Use data-testid attributes for selectors
- Avoid brittle CSS selectors
- Test with realistic data
- Handle async operations properly
- Use page object pattern for reusability

```typescript
// __tests__/e2e/page-objects/login-page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button:text("Login")');
  }

  async expectLoginSuccess() {
    await expect(this.page.locator('[data-testid="dashboard"]')).toBeVisible();
  }

  async expectLoginError(message: string) {
    await expect(this.page.locator('[data-testid="error"]')).toContainText(message);
  }
}

// Usage in test
test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@test.com', 'password123');
  await loginPage.expectLoginSuccess();
});
```

## Test Data Management

### Test Fixtures
```typescript
// __tests__/fixtures/users.ts
export const testUsers = {
  passenger: {
    id: 'passenger-test-1',
    email: 'passenger@test.com',
    password: 'TestPass123!',
    role: 'passenger',
    profile: {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      phone: '+639171234567'
    }
  },
  driver: {
    id: 'driver-test-1',
    email: 'driver@test.com',
    password: 'TestPass123!',
    role: 'driver',
    profile: {
      firstName: 'Pedro',
      lastName: 'Santos',
      phone: '+639181234567',
      licenseNumber: 'N01-12-345678',
      vehicleType: 'sedan',
      plateNumber: 'ABC1234'
    }
  },
  admin: {
    id: 'admin-test-1',
    email: 'admin@test.com',
    password: 'AdminPass123!',
    role: 'admin'
  }
};
```

### Database Seeding for Tests
```typescript
// __tests__/setup/seed.ts
export async function seedTestDatabase() {
  // Create test users
  await prisma.user.createMany({
    data: Object.values(testUsers)
  });

  // Create test rides
  await prisma.ride.createMany({
    data: testRides
  });

  // Create test payments
  await prisma.payment.createMany({
    data: testPayments
  });
}

// In test setup
beforeAll(async () => {
  await prisma.$connect();
  await seedTestDatabase();
});

afterAll(async () => {
  await prisma.ride.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});
```

## Defect Reporting

### Bug Report Template
```markdown
## Bug Report

**Title**: [Clear, concise description]

**Priority**: [Critical / High / Medium / Low]

**Environment**:
- Browser: [Chrome 120]
- OS: [macOS 14.2]
- Device: [Desktop / Mobile]

**Steps to Reproduce**:
1. [First step]
2. [Second step]
3. [Third step]

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots/Videos**:
[Attach visual evidence]

**Console Errors**:
```
[Any console errors]
```

**Additional Context**:
[Any other relevant information]

**Related Issues**:
[Link to related bugs/features]
```

### Severity Definitions

**Critical (P0)**:
- Application crashes
- Data loss
- Security vulnerabilities
- Payment processing failures
- Complete feature breakdown

**High (P1)**:
- Major functionality broken
- Workaround exists but difficult
- Affects many users
- Performance severely degraded

**Medium (P2)**:
- Minor functionality issues
- Easy workaround exists
- Affects some users
- UI/UX issues

**Low (P3)**:
- Cosmetic issues
- Minor inconsistencies
- Rare edge cases
- Enhancement requests

## Quality Metrics

### Test Coverage Targets
- Unit test coverage: > 80%
- Integration test coverage: > 70%
- E2E test coverage: 100% of critical paths
- API endpoint coverage: 100%

### Quality Gates
- All tests must pass
- No Critical or High bugs in production
- Code coverage meets targets
- Performance benchmarks met
- Security scans passing
- Accessibility standards met (WCAG 2.1 AA)

## Completion Checklist

Before marking QA tasks complete:

- [ ] Test plan created and reviewed
- [ ] All test cases executed
- [ ] Automated tests written and passing
- [ ] Test coverage targets met
- [ ] Defects documented and reported
- [ ] Critical bugs resolved and verified
- [ ] Performance benchmarks met
- [ ] Security testing completed
- [ ] Cross-browser testing done
- [ ] Mobile responsiveness verified
- [ ] PROJECT_STATE.md updated
- [ ] Test documentation complete

## Resources

### OpsTower Documentation
- [Testing Protocols](../../RIDESHARING_TESTING_PROTOCOLS.md)

### Testing Tools
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/)
- [k6 Load Testing](https://k6.io/docs/)

### Best Practices
- [Google Testing Blog](https://testing.googleblog.com/)
- [Martin Fowler - Testing](https://martinfowler.com/testing/)

---

**Remember**: Quality is everyone's responsibility, but QA is the final gatekeeper. Be thorough, be systematic, and never compromise on quality standards.
