# BSP Compliance Implementation Guide

## Overview

This document describes the implementation of **Issue #21: BSP Compliance Reporting** for OpsTower, covering Anti-Money Laundering (AML) monitoring, suspicious activity detection, and automated reporting to the Bangko Sentral ng Pilipinas (Central Bank of the Philippines).

**Status**: ✅ Complete
**Implementation Date**: 2026-02-07
**Developer**: Development Coordinator

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [AML Threshold Monitoring](#aml-threshold-monitoring)
4. [Suspicious Activity Detection](#suspicious-activity-detection)
5. [Report Generation](#report-generation)
6. [API Endpoints](#api-endpoints)
7. [Integration with Payment System](#integration-with-payment-system)
8. [Testing & Validation](#testing--validation)
9. [Deployment Checklist](#deployment-checklist)

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    BSP Compliance System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────┐  ┌────────────────────┐              │
│  │ AML Monitoring    │  │ Suspicious Activity │              │
│  │ Service           │  │ Detection           │              │
│  │                   │  │                     │              │
│  │ - Threshold Check │  │ - Structuring      │              │
│  │ - Risk Assessment │  │ - Rapid Succession │              │
│  │ - Auto-flagging   │  │ - Pattern Analysis │              │
│  └─────────┬─────────┘  └──────────┬─────────┘              │
│            │                       │                         │
│            └───────────┬───────────┘                         │
│                        │                                     │
│            ┌───────────▼───────────┐                         │
│            │  Report Generation    │                         │
│            │  Service              │                         │
│            │                       │                         │
│            │  - Daily Reports      │                         │
│            │  - Monthly Reports    │                         │
│            │  - SAR Reports        │                         │
│            └───────────┬───────────┘                         │
│                        │                                     │
│            ┌───────────▼───────────┐                         │
│            │  Database Layer       │                         │
│            │                       │                         │
│            │  - Transaction Logs   │                         │
│            │  - AML Records        │                         │
│            │  - Compliance Alerts  │                         │
│            └───────────────────────┘                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend**: Next.js API Routes (TypeScript)
- **Database**: PostgreSQL with advanced features
- **Services**: AML Monitoring, Report Generation
- **Storage**: File system for generated reports
- **Security**: Row-level security, encryption

---

## Database Schema

### Migration: 047_bsp_compliance.sql

Located at: `/database/migrations/047_bsp_compliance.sql`

#### Tables Created

1. **bsp_aml_monitoring**
   - Tracks all transactions for AML compliance
   - Monitors thresholds: ₱50,000 (single), ₱100,000 (daily), ₱500,000 (monthly)
   - Risk assessment and flagging

2. **bsp_suspicious_activity**
   - Suspicious pattern detection logs
   - Activity types: structuring, rapid succession, unusual patterns
   - Investigation tracking

3. **bsp_report_submissions**
   - Report generation and submission tracking
   - Daily, monthly, and suspicious activity reports
   - BSP acknowledgment tracking

4. **bsp_compliance_alerts**
   - Real-time alert system
   - Threshold breach notifications
   - Alert resolution tracking

5. **bsp_daily_summary**
   - Pre-aggregated daily transaction data
   - Performance optimization for reporting

#### Database Triggers

- **update_aml_cumulative_amounts**: Automatically calculates cumulative amounts
- **create_threshold_breach_alert**: Auto-generates alerts on threshold breach
- **update_payment_updated_at**: Timestamp management

#### Materialized Views

- **bsp_aml_dashboard**: AML monitoring dashboard metrics
- **bsp_suspicious_summary**: Suspicious activity summary
- **bsp_monthly_reconciliation**: Monthly reconciliation data

---

## AML Threshold Monitoring

### BSP Thresholds

```typescript
export const BSP_AML_THRESHOLDS = {
  singleTransaction: 50000,    // ₱50,000 per transaction
  dailyCumulative: 100000,     // ₱100,000 per day
  monthlyCumulative: 500000,   // ₱500,000 per month
};
```

### Service: AMLMonitoringService

**Location**: `/src/lib/compliance/bsp/aml-monitoring.ts`

#### Key Methods

1. **monitorTransaction(request)**
   - Monitors individual transaction
   - Checks all thresholds
   - Performs risk assessment
   - Generates alerts automatically

2. **assessRisk(params)**
   - Calculates risk score (0-100)
   - Determines risk level: low, medium, high, critical
   - Identifies risk factors

3. **getFlaggedTransactions()**
   - Returns transactions requiring manual review

4. **reviewAMLRecord()**
   - Allows compliance officer to review flagged transaction
   - Option to report to BSP

### Risk Factors

- High amount (>₱50,000): +30 points
- Daily threshold exceeded: +25 points
- Monthly threshold exceeded: +35 points
- Very high amount (>₱100,000): +20 points
- Round amounts: +10 points

**Risk Level Classification**:
- **Low**: 0-24 points
- **Medium**: 25-49 points
- **High**: 50-74 points
- **Critical**: 75-100 points

### Usage Example

```typescript
import { getAMLMonitoringService } from '@/lib/compliance/bsp';

const amlService = getAMLMonitoringService();

const result = await amlService.monitorTransaction({
  transactionId: 'TXN-123',
  paymentId: 'PAY-456',
  amount: 75000,
  currency: 'PHP',
  transactionType: 'ride_payment',
  userId: 'user-789',
  userType: 'passenger',
  transactionDate: new Date(),
});

console.log(result.requiresReview); // true (exceeds ₱50,000)
console.log(result.amlRecord.riskLevel); // 'high'
console.log(result.alertsTriggered.length); // 1+ alerts
```

---

## Suspicious Activity Detection

### Pattern Detection

The system automatically detects:

1. **Structuring (Smurfing)**
   - Multiple transactions just below ₱50,000 threshold
   - Detection: 3+ transactions between ₱40,000-₱49,999 in 24 hours

2. **Rapid Succession**
   - High velocity transactions
   - Detection: 5+ transactions within 1 hour

3. **Unusual Patterns** (Future enhancements)
   - Time anomalies
   - Geographic anomalies
   - New account large transactions

### Detection Methods

- **Automated**: Pattern detection algorithms
- **Manual**: Compliance officer flags
- **AI Model**: Machine learning (future)

### Suspicious Activity Report (SAR)

When activity is confirmed suspicious:
1. Investigate and document evidence
2. Generate SAR report
3. Submit to BSP
4. Track BSP acknowledgment

---

## Report Generation

### Service: BSPReportGenerationService

**Location**: `/src/lib/compliance/bsp/report-generation.ts`

#### Report Types

1. **Daily Transaction Report**
   - All transactions for a specific date
   - High-value transactions highlighted
   - Flagged transactions included
   - Format: CSV

2. **Monthly Reconciliation Report**
   - Aggregate monthly data
   - Total transactions and amounts
   - High-value count and amount
   - Suspicious activity summary
   - Format: CSV

3. **Suspicious Activity Report (SAR)**
   - Detected suspicious patterns
   - Evidence and investigation notes
   - Related transactions
   - Format: CSV

#### Report Storage

- **Directory**: `/var/opstower/reports/bsp/`
- **Naming**: `bsp_{type}_report_{date}.csv`
- **Security**: SHA-256 hash for integrity
- **Retention**: 7 years (BSP requirement)

#### Usage Example

```typescript
import { getBSPReportService } from '@/lib/compliance/bsp';

const reportService = getBSPReportService();

// Generate daily report
const result = await reportService.generateDailyReport({
  reportDate: new Date('2026-02-07'),
  includeHighValue: true,
  includeFlagged: true,
  format: 'csv',
});

console.log(result.reportId); // 'DAILY-2026-02-07-1707331200000'
console.log(result.filePath); // '/var/opstower/reports/bsp/...'
console.log(result.recordCount); // 1234
```

---

## API Endpoints

All endpoints are prefixed with `/api/compliance/bsp/`

### 1. GET /api/compliance/bsp/dashboard

Get compliance dashboard metrics

**Query Parameters**:
- `startDate` (optional): Start date (ISO string)
- `endDate` (optional): End date (ISO string)

**Response**:
```json
{
  "success": true,
  "dashboard": {
    "today": {
      "totalTransactions": 1234,
      "highValueCount": 56,
      "flaggedCount": 12
    },
    "amlStatistics": {
      "totalMonitored": 5678,
      "singleThresholdBreaches": 89,
      "dailyThresholdBreaches": 23
    },
    "complianceOverview": {
      "activeAlerts": 5,
      "pendingReviews": 12,
      "complianceScore": 85
    }
  }
}
```

### 2. GET /api/compliance/bsp/reports

List BSP reports

**Query Parameters**:
- `startDate`: Start date filter
- `endDate`: End date filter
- `reportType`: Filter by type

**Response**:
```json
{
  "success": true,
  "reports": [
    {
      "reportId": "DAILY-2026-02-07-...",
      "reportType": "daily_transactions",
      "totalTransactions": 1234,
      "status": "submitted"
    }
  ]
}
```

### 3. POST /api/compliance/bsp/reports

Generate new report

**Body**:
```json
{
  "reportType": "daily",
  "date": "2026-02-07"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "reportId": "DAILY-2026-02-07-...",
    "filePath": "/var/opstower/reports/...",
    "recordCount": 1234
  }
}
```

### 4. GET /api/compliance/bsp/aml-alerts

Get AML compliance alerts

**Query Parameters**:
- `status`: active, acknowledged, resolved
- `severity`: info, warning, error, critical
- `limit`: Number of alerts (default: 50)

### 5. GET /api/compliance/bsp/suspicious-activity

Get suspicious activities

**Query Parameters**:
- `status`: detected, under_review, escalated, cleared
- `severity`: low, medium, high, critical

### 6. GET /api/compliance/bsp/flagged-transactions

Get flagged transactions for review

**Query Parameters**:
- `limit`: Number of transactions (default: 50)

### 7. PATCH /api/compliance/bsp/flagged-transactions/[id]

Review a flagged transaction

**Body**:
```json
{
  "transactionId": "TXN-123",
  "reviewedBy": "user-456",
  "reviewNotes": "Verified legitimate transaction",
  "reportToBsp": false
}
```

---

## Integration with Payment System

### Automatic AML Monitoring

To integrate AML monitoring with payment processing:

**File**: `/src/lib/payments/maya/service.ts` (or similar)

```typescript
import { getAMLMonitoringService } from '@/lib/compliance/bsp';

// In initiatePayment method, after payment creation:
const amlService = getAMLMonitoringService();

const monitoringResult = await amlService.monitorTransaction({
  transactionId: paymentResponse.transactionId,
  paymentId: paymentResponse.checkoutId,
  amount: request.amount,
  currency: request.currency,
  transactionType: 'ride_payment',
  userId: request.userId,
  userType: request.userType,
  userName: request.customerName,
  userEmail: request.customerEmail,
  transactionDate: new Date(),
});

if (monitoringResult.requiresReview) {
  console.log('Transaction flagged for AML review');
  // Optional: Send notification to compliance team
}
```

### Payment Webhook Integration

Monitor completed payments in webhook handler:

```typescript
// In handleWebhook method, after status update:
if (newStatus === 'completed') {
  const amlService = getAMLMonitoringService();
  await amlService.monitorTransaction({
    // ... transaction details
  });
}
```

---

## Testing & Validation

### Test Cases

1. **Single Transaction Threshold**
   - Create transaction with amount = ₱75,000
   - Verify AML record created with `exceedsSingleThreshold = true`
   - Verify alert triggered
   - Verify flagged for review

2. **Daily Cumulative Threshold**
   - Create 3 transactions: ₱30,000, ₱40,000, ₱35,000 (total: ₱105,000)
   - Verify cumulative amount tracked
   - Verify daily threshold breach on 3rd transaction

3. **Structuring Detection**
   - Create 4 transactions: ₱45,000, ₱48,000, ₱46,000, ₱47,000 in 2 hours
   - Verify suspicious activity detected
   - Verify pattern type: 'structuring'

4. **Report Generation**
   - Generate daily report for test date
   - Verify CSV file created
   - Verify file hash calculated
   - Verify report submission record created

5. **API Endpoints**
   - Test all GET endpoints with various filters
   - Test POST endpoint for report generation
   - Test PATCH endpoint for transaction review

### Manual Testing Steps

```bash
# 1. Run database migration
psql -d opstower -f database/migrations/047_bsp_compliance.sql

# 2. Test AML monitoring
curl -X POST http://localhost:3000/api/payments/maya/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 75000,
    "currency": "PHP",
    "userId": "test-user-1",
    "userType": "passenger",
    "customerName": "Test User",
    "customerEmail": "test@example.com"
  }'

# 3. Check flagged transactions
curl http://localhost:3000/api/compliance/bsp/flagged-transactions

# 4. Generate daily report
curl -X POST http://localhost:3000/api/compliance/bsp/reports \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "daily",
    "date": "2026-02-07"
  }'

# 5. View dashboard
curl http://localhost:3000/api/compliance/bsp/dashboard
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run database migration 047
- [ ] Create reports directory: `/var/opstower/reports/bsp/`
- [ ] Set directory permissions: `chmod 755`
- [ ] Verify database triggers created
- [ ] Test materialized view refresh

### Environment Variables

No additional environment variables required. Uses existing database connection.

### Post-Deployment

- [ ] Verify API endpoints accessible
- [ ] Test AML monitoring on test transaction
- [ ] Generate test report
- [ ] Verify alerts triggering
- [ ] Set up automated daily report generation (cron job)

### Cron Jobs

Add to server crontab:

```bash
# Daily report generation at 1 AM
0 1 * * * curl -X POST http://localhost:3000/api/compliance/bsp/reports -H "Content-Type: application/json" -d '{"reportType":"daily","date":"'$(date -d yesterday +%Y-%m-%d)'"}'

# Refresh materialized views at midnight
0 0 * * * psql -d opstower -c "REFRESH MATERIALIZED VIEW CONCURRENTLY bsp_aml_dashboard;"
0 0 * * * psql -d opstower -c "REFRESH MATERIALIZED VIEW CONCURRENTLY bsp_suspicious_summary;"
0 0 1 * * psql -d opstower -c "REFRESH MATERIALIZED VIEW CONCURRENTLY bsp_monthly_reconciliation;"
```

### Monitoring

- [ ] Set up alert notifications (email/SMS)
- [ ] Monitor report generation success rate
- [ ] Monitor AML detection accuracy
- [ ] Review flagged transactions weekly
- [ ] Submit monthly reports to BSP

---

## Compliance Officer Workflow

### Daily Tasks

1. **Review Dashboard**
   - Check active alerts
   - Review pending transactions
   - Monitor compliance score

2. **Review Flagged Transactions**
   - Access: `/api/compliance/bsp/flagged-transactions`
   - Investigate high-value transactions
   - Document review notes
   - Decide whether to report to BSP

3. **Check Suspicious Activities**
   - Access: `/api/compliance/bsp/suspicious-activity`
   - Investigate detected patterns
   - Determine false positives
   - Escalate if necessary

### Weekly Tasks

1. **Generate Reports**
   - Review previous week's transactions
   - Generate daily reports if not automated
   - Verify report completeness

### Monthly Tasks

1. **Monthly Reconciliation**
   - Generate monthly report
   - Review high-value transactions
   - Submit SAR reports if required
   - Update BSP on resolved issues

---

## Future Enhancements

1. **AI/ML Pattern Detection**
   - Machine learning for suspicious pattern detection
   - Anomaly detection algorithms
   - Behavioral analysis

2. **Real-Time Alerts**
   - Email notifications for threshold breaches
   - SMS alerts for critical activities
   - Dashboard push notifications

3. **Advanced Analytics**
   - User risk profiling
   - Transaction velocity analysis
   - Geographic risk mapping

4. **BSP API Integration**
   - Direct submission to BSP portal (if API available)
   - Real-time acknowledgment tracking
   - Automated status updates

5. **Compliance Dashboard UI**
   - Visual compliance dashboard
   - Interactive charts and graphs
   - Export capabilities

---

## Support & Contact

For questions or issues:
- **Development Team**: development-coordinator@opstower.com
- **Compliance Team**: compliance@opstower.com
- **BSP Contact**: www.bsp.gov.ph

---

## References

- BSP Circular No. 950 (AML Regulations)
- Anti-Money Laundering Act (AMLA) - RA 9160
- BSP MORB (Manual of Regulations for Banks)
- Data Privacy Act of 2012 (RA 10173)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-07
**Status**: Complete & Ready for Production
