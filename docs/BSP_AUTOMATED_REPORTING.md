# BSP Automated Daily Report Generation

## Overview

This document describes the automated BSP (Bangko Sentral ng Pilipinas) compliance report generation system for OpsTower. The system automatically generates daily compliance reports at 1 AM, tracking all payment transactions, AML threshold breaches, and suspicious activities.

## Architecture

### Components

1. **Cron Job Module** (`src/lib/cron/bsp-daily-report.ts`)
   - Core business logic for report generation
   - Calculates yesterday's date and triggers report service
   - Comprehensive logging and error handling
   - Metric collection for monitoring

2. **Cron API Endpoint** (`src/app/api/cron/bsp-daily/route.ts`)
   - REST API endpoint for automated and manual report generation
   - Authorization via CRON_SECRET environment variable
   - Supports both GET (automated) and POST (manual) methods
   - Returns detailed report metadata

3. **Report Service** (`src/lib/compliance/bsp/report-generation.ts`)
   - Existing service that handles CSV generation
   - Calculates SHA-256 file integrity hash
   - Stores report metadata in database
   - Queries payment and AML monitoring data

4. **Manual UI** (`src/app/compliance/bsp/reports/page.tsx`)
   - Web interface for compliance officers
   - Manual report generation button
   - Report history table with download links
   - Real-time status tracking

5. **Vercel Cron Configuration** (`vercel.json`)
   - Schedules daily execution at 1 AM (UTC)
   - Cron expression: `0 1 * * *`

## Database Schema

### Tables Used

#### `bsp_report_submissions`
Stores report metadata and submission tracking.

```sql
- id (uuid)
- report_id (varchar) - Unique identifier like "DAILY-2026-02-07-1707264000000"
- report_type (varchar) - 'daily_transactions', 'monthly_reconciliation', etc.
- period_start (timestamp) - Report start date
- period_end (timestamp) - Report end date
- reporting_year (integer)
- reporting_month (integer)
- total_transactions (integer)
- total_amount (decimal)
- flagged_transactions (integer)
- suspicious_activities (integer)
- file_path (text) - Path to CSV file
- file_format (varchar) - 'csv', 'pdf', 'xml', 'json'
- file_size_bytes (bigint)
- file_hash (varchar) - SHA-256 integrity hash
- status (varchar) - 'draft', 'generated', 'submitted', 'acknowledged', 'rejected'
- bsp_reference_number (varchar) - BSP acknowledgment reference
- bsp_acknowledgment_date (timestamp)
- bsp_notes (text)
- generated_by (varchar)
- submitted_by (varchar)
- approved_by (varchar)
- generated_at (timestamp)
- submitted_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `bsp_daily_summary`
Daily aggregated statistics generated on-demand.

```sql
- summary_date (date)
- total_transactions (integer)
- completed_transactions (integer)
- failed_transactions (integer)
- refunded_transactions (integer)
- total_amount (decimal)
- total_completed (decimal)
- total_refunded (decimal)
- average_transaction (decimal)
- gcash_count (integer)
- gcash_amount (decimal)
- maya_count (integer)
- maya_amount (decimal)
- cash_count (integer)
- cash_amount (decimal)
- high_value_count (integer) - Transactions >= ₱50,000
- high_value_amount (decimal)
- flagged_count (integer)
- suspicious_count (integer)
- report_generated (boolean)
- report_id (varchar)
- generated_at (timestamp)
```

## Report Format

### CSV Structure

The generated CSV report includes:

**Transaction Records:**
```csv
Transaction ID,Transaction Time,User ID,Amount,Payment Method,Status,Flagged,Risk Level,Exceeds Threshold
TXN-001,2026-02-07T14:30:00,USER-123,55000,gcash,completed,true,high,true
TXN-002,2026-02-07T15:45:00,USER-456,25000,paymaya,completed,false,low,false
```

**Summary Section:**
```csv
SUMMARY
Total Transactions,248
Completed Transactions,235
Total Amount,4567890.50
High Value Count,12
Flagged Count,8
Suspicious Activities,3
```

### Report Fields

- **Transaction ID**: Unique payment transaction identifier
- **Transaction Time**: ISO 8601 timestamp
- **User ID**: User identifier (anonymized if required)
- **Amount**: Transaction amount in PHP
- **Payment Method**: gcash, paymaya, cash, etc.
- **Status**: completed, failed, refunded
- **Flagged**: true if exceeds AML thresholds
- **Risk Level**: low, medium, high, critical
- **Exceeds Threshold**: true if single transaction >= ₱50,000

## Scheduling

### Vercel Cron (Production)

**Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/bsp-daily",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**Schedule**: Daily at 1:00 AM UTC
**Timeout**: 300 seconds (Vercel limit)
**Frequency**: 24 hours

### Alternative Scheduling Options

#### GitHub Actions
Create `.github/workflows/daily-bsp-report.yml`:

```yaml
name: Daily BSP Report
on:
  schedule:
    - cron: '0 1 * * *'
  workflow_dispatch:

jobs:
  generate-report:
    runs-on: ubuntu-latest
    steps:
      - name: Generate BSP Report
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/bsp-daily
```

#### Node-cron (Self-hosted)
For self-hosted deployments, add to server startup:

```typescript
import cron from 'node-cron';
import { generateDailyBSPReport } from '@/lib/cron/bsp-daily-report';

// Run at 1:00 AM daily
cron.schedule('0 1 * * *', async () => {
  try {
    await generateDailyBSPReport();
  } catch (error) {
    console.error('Cron job failed:', error);
  }
});
```

## Security

### Authorization

All cron endpoints require the `CRON_SECRET` environment variable:

```bash
CRON_SECRET=your-secure-random-string-here
```

**Request Format:**
```bash
Authorization: Bearer your-secure-random-string-here
```

### Security Best Practices

1. **Generate strong CRON_SECRET**: Use 32+ character random string
2. **Rotate secrets regularly**: Change CRON_SECRET every 90 days
3. **Monitor unauthorized attempts**: Check logs for 401 responses
4. **Restrict API access**: Use IP allowlists if possible
5. **Audit report downloads**: Track who downloads report files

### File Integrity

Every report includes a SHA-256 hash for integrity verification:

```typescript
const fileHash = crypto.createHash('sha256')
  .update(fileBuffer)
  .digest('hex');
```

## Environment Variables

### Required

```bash
# Database connection (required for report generation)
DATABASE_URL=postgresql://user:pass@host:5432/database

# Cron job authentication (required for automated execution)
CRON_SECRET=your-secure-random-string-here

# Optional: Override default report storage path
BSP_REPORTS_PATH=/var/opstower/reports/bsp/
```

### Optional

```bash
# Node environment
NODE_ENV=production

# Logging level
LOG_LEVEL=info
```

## File Storage

### Default Path

Reports are stored at: `/var/opstower/reports/bsp/`

### File Naming Convention

```
bsp_daily_report_YYYY-MM-DD.csv
```

**Example**: `bsp_daily_report_2026-02-07.csv`

### Serverless Considerations

For serverless platforms (Vercel, AWS Lambda):
- File system is ephemeral and read-only
- Reports are stored in database `file_path` field
- Consider using:
  - **S3/R2/Cloud Storage** for permanent file storage
  - **Database BLOB fields** for small reports
  - **Email delivery** to compliance officers

**Recommended Approach for Vercel:**
```typescript
// Store in database instead of filesystem
const reportService = new BSPReportGenerationService('/tmp');
const result = await reportService.generateDailyReport({ reportDate });

// Upload to S3
await uploadToS3(result.filePath, 'bsp-reports/');

// Or email as attachment
await emailReport(result.filePath, 'compliance@company.com');
```

## Manual Report Generation

### Web UI

1. Navigate to `/compliance/bsp/reports`
2. Click "Generate Yesterday's Report" button
3. View report in table below
4. Download CSV file if needed

### API Endpoint

**Manual Trigger:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  https://your-domain.com/api/cron/bsp-daily
```

**Response:**
```json
{
  "success": true,
  "message": "BSP daily report generated successfully",
  "data": {
    "reportId": "DAILY-2026-02-07-1707264000000",
    "recordCount": 248,
    "fileSize": 45678,
    "filePath": "/var/opstower/reports/bsp/bsp_daily_report_2026-02-07.csv",
    "generatedAt": "2026-02-08T01:00:00.000Z"
  },
  "duration": "1234ms"
}
```

### CLI Command

```bash
# Local development
curl -H "Authorization: Bearer dev-secret-change-in-production" \
  http://localhost:4000/api/cron/bsp-daily

# Production
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://production-domain.com/api/cron/bsp-daily
```

## Testing

### Unit Tests

Test the report generation function:

```typescript
import { generateDailyBSPReport } from '@/lib/cron/bsp-daily-report';

describe('BSP Daily Report', () => {
  it('should generate report for yesterday', async () => {
    const result = await generateDailyBSPReport();

    expect(result.success).toBe(true);
    expect(result.reportId).toMatch(/^DAILY-/);
    expect(result.recordCount).toBeGreaterThanOrEqual(0);
  });
});
```

### Integration Tests

Test the API endpoint:

```bash
# Test manual trigger
curl -X POST \
  -H "Authorization: Bearer dev-secret" \
  http://localhost:4000/api/cron/bsp-daily

# Expected: 200 OK with report metadata
```

### Verification Steps

1. **Database Record Created**:
```sql
SELECT * FROM bsp_report_submissions
WHERE report_date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 1;
```

2. **File Created** (if not serverless):
```bash
ls -la /var/opstower/reports/bsp/
cat /var/opstower/reports/bsp/bsp_daily_report_2026-02-07.csv
```

3. **File Hash Integrity**:
```bash
sha256sum /var/opstower/reports/bsp/bsp_daily_report_2026-02-07.csv
# Compare with file_hash in database
```

4. **Daily Summary Updated**:
```sql
SELECT * FROM bsp_daily_summary
WHERE summary_date = CURRENT_DATE - INTERVAL '1 day';
-- Check report_generated = true
-- Check report_id matches
```

## Monitoring

### Logs

All report generation events are logged:

```typescript
logger.info('Starting daily BSP report generation', {
  reportDate: '2026-02-07',
  scheduledTime: '2026-02-08T01:00:00.000Z'
});

logger.info('Daily BSP report generated successfully', {
  reportId: 'DAILY-2026-02-07-1707264000000',
  recordCount: 248,
  fileSize: 45678,
  duration: '1234ms'
});
```

### Metrics

Track report generation success/failure:

```typescript
logger.metric('bsp_daily_report_generated', 1, {
  status: 'success',
  record_count: '248'
});
```

### Alerts

Set up monitoring alerts for:
- Report generation failures (status != 200)
- Long execution times (> 30 seconds)
- High flagged transaction counts (> threshold)
- Missing daily reports (no report for yesterday)

**Example Alert Query:**
```sql
-- Check for missing reports
SELECT CURRENT_DATE - INTERVAL '1 day' as expected_date
WHERE NOT EXISTS (
  SELECT 1 FROM bsp_report_submissions
  WHERE period_start::date = CURRENT_DATE - INTERVAL '1 day'
    AND report_type = 'daily_transactions'
);
```

## Troubleshooting

### Report Generation Fails

**Error**: "Failed to generate daily BSP report"

**Possible Causes**:
1. Database connection timeout
2. No transactions for the date
3. File system permissions (self-hosted)
4. Insufficient memory/timeout (serverless)

**Solutions**:
1. Check database connection: `SELECT 1;`
2. Query transactions: `SELECT COUNT(*) FROM payments WHERE DATE(created_at) = '2026-02-07';`
3. Check directory permissions: `ls -la /var/opstower/reports/bsp/`
4. Increase serverless timeout in `vercel.json`

### Cron Job Not Running

**Error**: No logs at scheduled time

**Possible Causes**:
1. Vercel cron not configured
2. CRON_SECRET not set
3. Function timeout exceeded
4. Region/timezone issues

**Solutions**:
1. Verify `vercel.json` is in project root
2. Check environment variable: `echo $CRON_SECRET`
3. Review Vercel dashboard > Settings > Cron Jobs
4. Check execution logs in Vercel dashboard

### Unauthorized 401 Error

**Error**: "Unauthorized BSP cron job attempt"

**Possible Causes**:
1. Missing CRON_SECRET
2. Incorrect authorization header
3. Secret mismatch between environments

**Solutions**:
1. Set environment variable in Vercel dashboard
2. Use correct format: `Authorization: Bearer SECRET`
3. Verify secret matches: `curl -H "Authorization: Bearer $CRON_SECRET" ...`

### File Not Found

**Error**: "ENOENT: no such file or directory"

**Possible Causes**:
1. Directory doesn't exist
2. Serverless read-only filesystem
3. Incorrect path configuration

**Solutions**:
1. Create directory: `mkdir -p /var/opstower/reports/bsp/`
2. Use `/tmp` for serverless: `new BSPReportGenerationService('/tmp')`
3. Store in database or cloud storage instead

## Compliance Notes

### BSP Requirements

- **Daily Reports**: Must be generated by 2 AM for previous day
- **Retention**: Reports must be kept for 7 years
- **Integrity**: File hash verification required
- **Audit Trail**: All report access must be logged

### Data Protection

- **PII Redaction**: Consider anonymizing user data in reports
- **Encryption**: Encrypt reports at rest and in transit
- **Access Control**: Restrict report downloads to compliance officers
- **Secure Transmission**: Use HTTPS/SFTP for BSP submission

## Future Enhancements

### Planned Features

1. **Automatic BSP Submission**: API integration with BSP portal
2. **Email Notifications**: Send reports to compliance officers
3. **Report Validation**: Pre-submission data quality checks
4. **Cloud Storage**: S3/Azure Blob integration
5. **Encrypted Archives**: AES-256 encryption for sensitive reports
6. **Historical Reports**: Generate reports for past dates
7. **Monthly Reconciliation**: Automated monthly report generation
8. **Dashboard Widgets**: Real-time report status in compliance dashboard

### API Extensions

Future endpoints to consider:

```typescript
// Download report file
GET /api/compliance/bsp/reports/:reportId/download

// Submit to BSP (when API available)
POST /api/compliance/bsp/reports/:reportId/submit

// Verify file integrity
POST /api/compliance/bsp/reports/:reportId/verify

// Generate custom date range
POST /api/compliance/bsp/reports/generate
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "reportType": "monthly"
}
```

## Support

For issues or questions:
- GitHub Issues: [project-repo]/issues
- Email: compliance@company.com
- Slack: #compliance-tech

## References

- BSP Circular No. 950 (AML Compliance)
- BSP Manual of Regulations for Banks
- OpsTower Compliance Documentation
- [BSP Official Website](https://www.bsp.gov.ph/)
