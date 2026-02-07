/**
 * K6 Load Testing Suite for OpsTower
 *
 * Tests:
 * - API response times
 * - Concurrent user load
 * - Database performance
 * - WebSocket connections
 * - Payment gateway latency
 *
 * Usage:
 *   k6 run __tests__/performance/k6-load-test.js
 *   k6 run --vus 100 --duration 5m __tests__/performance/k6-load-test.js
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// Custom metrics
const apiResponseTime = new Trend('api_response_time');
const apiSuccessRate = new Rate('api_success_rate');
const wsConnectionTime = new Trend('ws_connection_time');
const wsMessageRate = new Rate('ws_message_rate');
const dbQueryTime = new Trend('db_query_time');
const paymentLatency = new Trend('payment_latency');
const errorCount = new Counter('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike to 200 users
    { duration: '3m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    // API Performance Thresholds
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'], // Error rate < 1%

    // Custom Thresholds
    'api_response_time': ['p(95)<400', 'p(99)<800'],
    'api_success_rate': ['rate>0.99'], // 99% success rate
    'ws_connection_time': ['p(95)<1000'], // WebSocket connection < 1s
    'ws_message_rate': ['rate>0.95'], // 95% message delivery
    'db_query_time': ['p(95)<100'], // DB queries < 100ms
    'payment_latency': ['p(95)<2000'], // Payment processing < 2s
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;
const WS_URL = BASE_URL.replace('http', 'ws');

const TEST_USERS = [
  { email: 'admin@xpress.ph', password: 'admin123' },
  { email: 'dispatcher@xpress.ph', password: 'admin123' },
  { email: 'analyst@xpress.ph', password: 'admin123' },
];

const DRIVERS = Array.from({ length: 50 }, (_, i) => `drv-${String(i + 1).padStart(4, '0')}`);
const PASSENGERS = Array.from({ length: 50 }, (_, i) => `pass-${String(i + 1).padStart(4, '0')}`);

// Helper functions
function authenticateUser(user) {
  const loginRes = http.post(`${API_URL}/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => JSON.parse(r.body).token !== undefined,
  });

  return loginRes.status === 200 ? JSON.parse(loginRes.body).token : null;
}

function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// Main test scenario
export default function () {
  // Randomly select user type
  const userIndex = Math.floor(Math.random() * TEST_USERS.length);
  const user = TEST_USERS[userIndex];

  // Authenticate
  const token = authenticateUser(user);
  if (!token) {
    errorCount.add(1);
    return;
  }

  const headers = getAuthHeaders(token);

  // Test API Endpoints
  group('API Endpoints', () => {
    testDriversAPI(headers);
    testBookingsAPI(headers);
    testAnalyticsAPI(headers);
    testLocationsAPI(headers);
    testAlertsAPI(headers);
  });

  // Test Database-Heavy Operations
  group('Database Operations', () => {
    testDatabaseQueries(headers);
  });

  // Test Real-time Features
  if (Math.random() > 0.7) { // 30% of users test WebSocket
    group('Real-time WebSocket', () => {
      testWebSocketConnection(token);
    });
  }

  // Test Payment Gateway
  if (Math.random() > 0.8) { // 20% of requests test payments
    group('Payment Gateway', () => {
      testPaymentProcessing(headers);
    });
  }

  sleep(1); // Think time between iterations
}

// API Endpoint Tests
function testDriversAPI(headers) {
  const startTime = Date.now();
  const res = http.get(`${API_URL}/drivers`, { headers });
  const duration = Date.now() - startTime;

  apiResponseTime.add(duration);
  apiSuccessRate.add(res.status === 200);

  check(res, {
    'drivers endpoint status 200': (r) => r.status === 200,
    'drivers response time < 500ms': () => duration < 500,
    'drivers returns array': (r) => Array.isArray(JSON.parse(r.body).drivers || []),
  });
}

function testBookingsAPI(headers) {
  const startTime = Date.now();
  const res = http.get(`${API_URL}/bookings?limit=50`, { headers });
  const duration = Date.now() - startTime;

  apiResponseTime.add(duration);
  apiSuccessRate.add(res.status === 200);

  check(res, {
    'bookings endpoint status 200': (r) => r.status === 200,
    'bookings response time < 500ms': () => duration < 500,
    'bookings pagination works': (r) => {
      const body = JSON.parse(r.body);
      return body.bookings && body.bookings.length <= 50;
    },
  });
}

function testAnalyticsAPI(headers) {
  const startTime = Date.now();
  const res = http.get(`${API_URL}/analytics`, { headers });
  const duration = Date.now() - startTime;

  apiResponseTime.add(duration);
  apiSuccessRate.add(res.status === 200);

  check(res, {
    'analytics endpoint status 200': (r) => r.status === 200,
    'analytics response time < 800ms': () => duration < 800, // More complex query
    'analytics has metrics': (r) => {
      const body = JSON.parse(r.body);
      return body.metrics !== undefined;
    },
  });
}

function testLocationsAPI(headers) {
  const startTime = Date.now();
  const res = http.get(`${API_URL}/locations?region=reg-001`, { headers });
  const duration = Date.now() - startTime;

  apiResponseTime.add(duration);
  apiSuccessRate.add(res.status === 200);

  check(res, {
    'locations endpoint status 200': (r) => r.status === 200,
    'locations response time < 300ms': () => duration < 300, // Should be fast (Redis)
    'locations returns coordinates': (r) => {
      const body = JSON.parse(r.body);
      return body.locations && body.locations.length > 0;
    },
  });
}

function testAlertsAPI(headers) {
  const startTime = Date.now();
  const res = http.get(`${API_URL}/alerts?status=active`, { headers });
  const duration = Date.now() - startTime;

  apiResponseTime.add(duration);
  apiSuccessRate.add(res.status === 200);

  check(res, {
    'alerts endpoint status 200': (r) => r.status === 200,
    'alerts response time < 400ms': () => duration < 400,
  });
}

// Database Performance Tests
function testDatabaseQueries(headers) {
  // Test complex joins
  const startTime = Date.now();
  const res = http.get(`${API_URL}/drivers?include=bookings,ratings`, { headers });
  const duration = Date.now() - startTime;

  dbQueryTime.add(duration);

  check(res, {
    'complex query status 200': (r) => r.status === 200,
    'complex query < 200ms': () => duration < 200, // With optimized indexes
    'complex query returns joined data': (r) => {
      const body = JSON.parse(r.body);
      return body.drivers && body.drivers[0]?.bookings !== undefined;
    },
  });

  // Test spatial queries
  const spatialStart = Date.now();
  const spatialRes = http.get(`${API_URL}/drivers/nearby?lat=14.6042&lon=120.9822&radius=5000`, { headers });
  const spatialDuration = Date.now() - spatialStart;

  dbQueryTime.add(spatialDuration);

  check(spatialRes, {
    'spatial query status 200': (r) => r.status === 200,
    'spatial query < 150ms': () => spatialDuration < 150, // PostGIS should be fast
    'spatial query returns nearby drivers': (r) => {
      const body = JSON.parse(r.body);
      return body.drivers && body.drivers.length >= 0;
    },
  });
}

// WebSocket Performance Tests
function testWebSocketConnection(token) {
  const url = `${WS_URL}/api/ws?token=${token}`;
  const startTime = Date.now();

  let connectionEstablished = false;
  let messagesReceived = 0;

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      connectionEstablished = true;
      wsConnectionTime.add(Date.now() - startTime);

      // Subscribe to driver locations
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'driver-locations',
        region: 'reg-001'
      }));
    });

    socket.on('message', (data) => {
      messagesReceived++;
      wsMessageRate.add(1);

      try {
        const message = JSON.parse(data);
        check(message, {
          'ws message has valid structure': (m) => m.type !== undefined,
        });
      } catch (e) {
        wsMessageRate.add(0);
        errorCount.add(1);
      }
    });

    socket.on('error', (e) => {
      wsMessageRate.add(0);
      errorCount.add(1);
    });

    socket.setTimeout(() => {
      socket.close();
    }, 5000); // Keep connection open for 5 seconds
  });

  check(res, {
    'ws connection established': () => connectionEstablished,
    'ws connection time < 1s': () => (Date.now() - startTime) < 1000,
    'ws received messages': () => messagesReceived > 0,
  });
}

// Payment Gateway Performance Tests
function testPaymentProcessing(headers) {
  const bookingId = `bkg-${String(Math.floor(Math.random() * 200) + 1).padStart(5, '0')}`;

  // Test payment initiation
  const startTime = Date.now();
  const payload = {
    bookingId,
    amount: 285.50,
    paymentMethod: 'gcash',
  };

  const res = http.post(`${API_URL}/payments/initiate`, JSON.stringify(payload), { headers });
  const duration = Date.now() - startTime;

  paymentLatency.add(duration);

  check(res, {
    'payment initiation status 200': (r) => r.status === 200 || r.status === 201,
    'payment initiation < 2s': () => duration < 2000, // External API involved
    'payment returns transaction ID': (r) => {
      const body = JSON.parse(r.body);
      return body.transactionId !== undefined;
    },
  });

  // Test payment status check
  if (res.status === 200 || res.status === 201) {
    const body = JSON.parse(res.body);
    const transactionId = body.transactionId;

    sleep(1); // Wait before status check

    const statusStart = Date.now();
    const statusRes = http.get(`${API_URL}/payments/status/${transactionId}`, { headers });
    const statusDuration = Date.now() - statusStart;

    paymentLatency.add(statusDuration);

    check(statusRes, {
      'payment status check successful': (r) => r.status === 200,
      'payment status < 500ms': () => statusDuration < 500,
    });
  }
}

// Generate HTML report
export function handleSummary(data) {
  return {
    'performance-report.html': htmlReport(data),
    'performance-summary.json': JSON.stringify(data, null, 2),
  };
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed. Summary:');
  console.log(`- Total requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`- Average response time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`- 95th percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`- 99th percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`);
  console.log(`- Error rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
}
