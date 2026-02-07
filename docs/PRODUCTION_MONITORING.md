# Production Monitoring System

## Overview

The Production Monitoring System provides real-time visibility into system health, performance metrics, and operational status. It monitors payment gateways, database connections, cache servers, and application performance.

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2026-02-07
**Related Issue**: #22 - Production Monitoring

---

## Features

### 1. Real-Time Monitoring Dashboard
- System-wide health overview
- Payment gateway status (Maya, GCash)
- Database connectivity and performance
- Redis cache status
- WebSocket connection monitoring
- Active users and drivers
- Current bookings
- Error rate tracking

### 2. Health Check Endpoints
- Overall system health
- Individual service health checks
- Automatic status determination
- Response time tracking
- Uptime monitoring

### 3. Alerting System
- Email alerts for critical errors
- Configurable alert thresholds
- Alert acknowledgment workflow
- Escalation procedures

### 4. Metrics Collection
- API response times
- Database query performance
- Payment success rates
- Error tracking and categorization
- User activity metrics

---

## Architecture

```
Production Monitoring System
├── Dashboard UI (/monitoring)
│   ├── System Health Overview
│   ├── Payment Gateway Status
│   ├── Infrastructure Metrics
│   └── Quick Actions
├── Health Check APIs (/api/health/)
│   ├── GET /health - Overall health
│   ├── GET /health/database - DB status
│   ├── GET /health/redis - Cache status
│   ├── GET /health/payments - Gateway status
│   └── GET /health/websockets - WS status
├── Monitoring APIs (/api/monitoring/)
│   ├── GET /monitoring/health - Detailed health
│   ├── GET /monitoring/metrics - System metrics
│   ├── GET /monitoring/alerts - Active alerts
│   └── GET /monitoring/dashboard - Dashboard data
├── Metrics Collection
│   ├── metricsCollector - Generic metrics
│   ├── errorTracker - Error tracking
│   └── businessMetrics - Business KPIs
└── Alerting System
    ├── alertHandlers - Alert processors
    └── alertingSystem - Alert manager
```

---

## Health Check Endpoints

### 1. Overall System Health

**GET** `/api/health?detailed=true`

Comprehensive system health check.

**Response:**
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
        "uptime": 86400,
        "lastCheck": "2026-02-07T10:00:00Z",
        "metrics": {
          "totalConnections": 20,
          "idleConnections": 15,
          "waitingConnections": 0
        }
      },
      {
        "name": "redis",
        "status": "HEALTHY",
        "responseTime": 12,
        "uptime": 86400,
        "lastCheck": "2026-02-07T10:00:00Z",
        "metrics": {
          "connections": 5,
          "memory_usage": 1024000
        }
      }
    ],
    "responseTime": 150,
    "timestamp": "2026-02-07T10:00:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - System healthy or degraded
- `503 Service Unavailable` - System unhealthy

**Health Status Levels:**
- **HEALTHY** - All services operating normally
- **DEGRADED** - Some services experiencing issues
- **UNHEALTHY** - Critical services down

### 2. Database Health

**GET** `/api/health/database`

PostgreSQL database connectivity and performance.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "healthy": true,
    "responseTime": 45,
    "metrics": {
      "total": 20,
      "idle": 15,
      "waiting": 0,
      "responseTime": 45
    },
    "timestamp": "2026-02-07T10:00:00Z"
  }
}
```

**Monitored Metrics:**
- Connection pool status
- Query response time
- Active connections
- Waiting connections

**Degraded Conditions:**
- Response time > 5 seconds
- Waiting connections > 10

### 3. Redis Health

**GET** `/api/health/redis`

Redis cache server status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "healthy": true,
    "responseTime": 12,
    "metrics": {
      "responseTime": 12
    },
    "timestamp": "2026-02-07T10:00:00Z"
  }
}
```

**Note:** Redis is optional. If not configured, returns `not_configured` status.

### 4. Payment Gateways Health

**GET** `/api/health/payments`

Maya and GCash payment gateway availability.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "healthy": true,
    "gateways": [
      {
        "provider": "maya",
        "available": true,
        "successRate": 98.5,
        "avgResponseTime": 450,
        "totalTransactions": 1250,
        "failedTransactions": 19,
        "lastSuccess": "2026-02-07T09:58:00Z",
        "lastFailure": "2026-02-07T09:30:00Z"
      },
      {
        "provider": "gcash",
        "available": true,
        "successRate": 96.2,
        "avgResponseTime": 650,
        "totalTransactions": 850,
        "failedTransactions": 32,
        "lastSuccess": "2026-02-07T09:59:00Z",
        "lastFailure": "2026-02-07T09:45:00Z"
      }
    ],
    "summary": {
      "total": 2,
      "available": 2,
      "unavailable": 0,
      "degraded": 0
    },
    "responseTime": 85,
    "timestamp": "2026-02-07T10:00:00Z"
  }
}
```

**Gateway Status:**
- **Available** - Gateway operational
- **Degraded** - Success rate < 95%
- **Unavailable** - Gateway not responding

### 5. WebSocket Health

**GET** `/api/health/websockets`

WebSocket server status and connection metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "healthy": true,
    "metrics": {
      "activeConnections": 45,
      "totalConnections": 128,
      "responseTime": 8
    },
    "timestamp": "2026-02-07T10:00:00Z"
  }
}
```

---

## Monitoring Dashboard

### Access

Navigate to: `/monitoring`

**URL**: `https://opstower.ph/monitoring`

### Features

#### 1. System Health Overview
- Overall system status badge
- Individual service health cards
- Response time metrics
- Uptime statistics

#### 2. Payment Gateway Status
- Provider availability indicators
- Success rate percentages
- Average response times
- Transaction statistics
- Visual progress bars

#### 3. Infrastructure Metrics
- Database connection pool
- Redis cache status
- WebSocket connections
- Memory usage

#### 4. Quick Actions
- View Analytics
- View Active Alerts
- Check Active Users
- Check Active Drivers

### Auto-Refresh

Dashboard auto-refreshes every 30 seconds. Manual refresh available via "Refresh Now" button.

---

## Metrics Collection

### System Metrics

```typescript
import { metricsCollector } from '@/lib/monitoring/metrics-collector';

// Record custom metric
metricsCollector.recordMetric('api_response_time', 145, 'timer', {
  endpoint: '/api/bookings',
  method: 'POST',
  status: 'success'
});

// Get system metrics
const systemMetrics = metricsCollector.getSystemMetrics();
```

### Error Tracking

```typescript
import { errorTracker } from '@/lib/monitoring/error-tracker';

// Track error
errorTracker.trackError(error, 'ERROR', {
  component: 'PaymentAPI',
  action: 'processPayment',
  userId: 'user-123'
});

// Get error statistics
const stats = errorTracker.getErrorStatistics(24); // Last 24 hours
```

### Business Metrics

```typescript
import { businessMetrics } from '@/lib/monitoring/business-metrics';

// Track booking created
businessMetrics.recordBookingCreated({
  bookingId: 'booking-123',
  userId: 'user-123',
  amount: 500,
  region: 'Metro Manila'
});

// Get business KPIs
const kpis = await businessMetrics.getKPIs();
```

---

## Alerting System

### Alert Types

1. **PERFORMANCE** - Response time, latency issues
2. **SECURITY** - Auth failures, suspicious activity
3. **BUSINESS** - Transaction failures, fraud detection
4. **SYSTEM** - Service outages, resource exhaustion
5. **DATABASE** - Connection issues, query performance

### Alert Severity Levels

- **LOW** - Informational, no action required
- **MEDIUM** - Attention needed, non-critical
- **HIGH** - Action required soon
- **CRITICAL** - Immediate action required

### Configuring Alerts

Alerts are configured in the database:

```sql
INSERT INTO alerts (
  name,
  description,
  type,
  severity,
  conditions,
  actions
) VALUES (
  'High Payment Failure Rate',
  'Payment success rate below 90%',
  'BUSINESS',
  'HIGH',
  '[{"metric": "payment_success_rate", "operator": "LT", "threshold": 90}]',
  '[{"type": "EMAIL", "target": "ops@opstower.ph"}]'
);
```

### Alert Actions

**Email Alerts:**
```json
{
  "type": "EMAIL",
  "target": "ops@opstower.ph",
  "template": "payment_failure_alert",
  "enabled": true
}
```

**SMS Alerts:**
```json
{
  "type": "SMS",
  "target": "+639171234567",
  "enabled": true
}
```

**Webhook Alerts:**
```json
{
  "type": "WEBHOOK",
  "target": "https://hooks.slack.com/services/...",
  "enabled": true
}
```

---

## Performance Thresholds

### API Response Times
- **Good**: < 200ms
- **Acceptable**: 200ms - 1s
- **Slow**: 1s - 3s
- **Critical**: > 3s

### Database Queries
- **Good**: < 50ms
- **Acceptable**: 50ms - 200ms
- **Slow**: 200ms - 500ms
- **Critical**: > 500ms

### Payment Gateways
- **Good**: < 500ms
- **Acceptable**: 500ms - 2s
- **Slow**: 2s - 5s
- **Critical**: > 5s

### Success Rates
- **Healthy**: > 98%
- **Degraded**: 95% - 98%
- **Unhealthy**: < 95%

---

## Monitoring Best Practices

### 1. Regular Health Checks

Set up automated health checks:
```bash
# Cron job (every 5 minutes)
*/5 * * * * curl https://opstower.ph/api/health
```

### 2. Alert Configuration

- Set appropriate thresholds
- Avoid alert fatigue
- Implement escalation procedures
- Document alert procedures

### 3. Dashboard Review

- Review dashboard daily
- Investigate degraded services
- Track trends over time
- Monitor peak hours

### 4. Performance Optimization

- Monitor slow queries
- Optimize database indexes
- Cache frequently accessed data
- Scale resources as needed

---

## Troubleshooting

### Dashboard Not Loading

**Check:**
1. Browser console for errors
2. API endpoints responding: `/api/health`
3. Authentication status
4. Network connectivity

### Metrics Not Updating

**Check:**
1. Metrics collector running
2. Database connection
3. Background jobs active
4. Materialized views refreshed

### Alerts Not Firing

**Check:**
1. Alert configuration: `alerts` table
2. Alert evaluation service running
3. Email/SMS credentials configured
4. Alert conditions met

### False Positives

**Actions:**
1. Review alert thresholds
2. Adjust time windows
3. Add exception filters
4. Update alert logic

---

## Maintenance

### Daily Tasks
- Review monitoring dashboard
- Check active alerts
- Verify critical services
- Monitor payment success rates

### Weekly Tasks
- Review performance trends
- Analyze error patterns
- Update alert thresholds
- Refresh materialized views

### Monthly Tasks
- Performance optimization review
- Capacity planning
- Alert effectiveness review
- Documentation updates

---

## Metrics Export

### Prometheus Format

Expose metrics for Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'opstower'
    static_configs:
      - targets: ['opstower.ph:4000']
    metrics_path: '/api/monitoring/metrics/prometheus'
    scrape_interval: 30s
```

### Grafana Dashboard

Import dashboard from: `docs/grafana/opstower-dashboard.json`

**Panels:**
- System Health
- Payment Gateway Status
- Database Performance
- API Response Times
- Error Rates
- Business KPIs

---

## API Integration

### Monitoring API Client

```typescript
// TypeScript example
const monitoringClient = {
  async getSystemHealth() {
    const response = await fetch('https://opstower.ph/api/health?detailed=true');
    return response.json();
  },

  async getPaymentHealth() {
    const response = await fetch('https://opstower.ph/api/health/payments');
    return response.json();
  },

  async getDatabaseHealth() {
    const response = await fetch('https://opstower.ph/api/health/database');
    return response.json();
  },

  async getActiveAlerts() {
    const response = await fetch('https://opstower.ph/api/monitoring/alerts');
    return response.json();
  }
};

// Usage
const health = await monitoringClient.getSystemHealth();
if (health.data.overall === 'UNHEALTHY') {
  console.error('System unhealthy!', health.data);
}
```

---

## Security

### Access Control
- Dashboard requires authentication
- Role-based access (admin only)
- API rate limiting enabled
- Audit logging for all actions

### Data Privacy
- No sensitive data in logs
- Metrics anonymized
- GDPR compliant
- Regular security audits

---

## Support

### Documentation
- This guide
- API Reference: `/api/monitoring/docs`
- Video tutorials: Available on request

### Contact
- Technical Support: support@opstower.ph
- Emergency: +63 917 123 4567
- Slack: #monitoring-alerts

---

## Appendix

### A. HTTP Status Codes

- `200 OK` - Service healthy or degraded
- `503 Service Unavailable` - Service unhealthy
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

### B. Service Names

- `database` - PostgreSQL database
- `redis` - Redis cache
- `application` - Node.js application
- `external_services` - Third-party APIs
- `filesystem` - File system
- `memory` - Memory usage

### C. Metric Units

- `count` - Simple counter
- `gauge` - Point-in-time value
- `histogram` - Distribution of values
- `timer` - Duration in milliseconds
- `percentage` - Percentage (0-100)

---

## Changelog

### Version 1.0.0 (2026-02-07)
- ✅ Initial release
- ✅ Real-time dashboard
- ✅ Health check endpoints
- ✅ Payment gateway monitoring
- ✅ Infrastructure monitoring
- ✅ Alert system foundation

---

**Production Status**: ✅ Ready for Deployment
**Monitoring URL**: https://opstower.ph/monitoring
