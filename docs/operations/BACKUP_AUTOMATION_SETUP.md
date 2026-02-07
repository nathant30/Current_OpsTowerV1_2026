# OpsTower Backup Automation Setup Guide

**Purpose**: Configure automated backup jobs for OpsTower production environment
**Target RTO**: 4 hours
**Target RPO**: 1 hour
**Backup Frequency**: Hourly
**Created**: 2026-02-07
**Issue**: #23 - Backup & DR Testing

---

## Table of Contents

1. [Overview](#overview)
2. [Cron-Based Setup (Recommended)](#cron-based-setup-recommended)
3. [Systemd Timer Setup (Alternative)](#systemd-timer-setup-alternative)
4. [Monitoring Configuration](#monitoring-configuration)
5. [Alert Configuration](#alert-configuration)
6. [Testing & Verification](#testing--verification)
7. [Troubleshooting](#troubleshooting)

---

## Overview

OpsTower uses automated backup jobs to ensure:
- ✅ Hourly database backups (RPO: < 1 hour)
- ✅ Weekly backup verification
- ✅ Automatic cleanup of old backups
- ✅ S3 cloud storage replication
- ✅ Continuous monitoring and alerting

### Backup Schedule

| Job | Frequency | Cron Expression | Purpose |
|-----|-----------|----------------|---------|
| Database Backup | Hourly | `0 * * * *` | Full pg_dump backup |
| Backup Verification | Weekly | `0 2 * * 0` | Integrity testing |
| Backup Health Check | Every 15 min | `*/15 * * * *` | Monitor backup age |

---

## Cron-Based Setup (Recommended)

### Prerequisites

- ✅ PostgreSQL client tools installed (`pg_dump`, `psql`)
- ✅ AWS CLI installed and configured (for S3 uploads)
- ✅ Backup scripts executable (`chmod +x scripts/*.sh`)
- ✅ Environment variables configured (`.env` file)
- ✅ Backup directory created (`/var/backups/opstower`)

### Step 1: Verify Script Paths

```bash
# Navigate to project directory
cd /Users/nathan/Desktop/Current_OpsTowerV1_2026

# Verify scripts are executable
ls -la scripts/backup-database.sh
ls -la scripts/restore-database.sh
ls -la scripts/verify-backup.sh

# Expected: -rwxr-xr-x permissions
```

### Step 2: Test Manual Execution

Before setting up automation, test each script manually:

```bash
# Test backup script
./scripts/backup-database.sh --local-only

# Expected output:
# [INFO] OpsTower Database Backup - Started
# [INFO] Checking prerequisites...
# [INFO] Prerequisites check passed
# [INFO] Starting database backup...
# ...
# [INFO] OpsTower Database Backup - Completed Successfully

# Verify backup file created
ls -lh /var/backups/opstower/opstower_*.sql.gz

# Test verification script
./scripts/verify-backup.sh /var/backups/opstower/opstower_latest.sql.gz

# Expected: ALL TESTS PASSED
```

### Step 3: Create Log Directory

```bash
# Create log directory for cron jobs
sudo mkdir -p /var/log/opstower
sudo chown opstower:opstower /var/log/opstower
sudo chmod 750 /var/log/opstower

# Create log rotation configuration
sudo tee /etc/logrotate.d/opstower-backup << 'EOF'
/var/log/opstower/backup.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 opstower opstower
}

/var/log/opstower/verify.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 0640 opstower opstower
}
EOF
```

### Step 4: Configure Cron Jobs

#### Option A: User Crontab (Recommended for Development)

```bash
# Edit user crontab
crontab -e

# Add the following entries:
```

```cron
# OpsTower Automated Backup Jobs
# Environment variables
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
PROJECT_DIR=/Users/nathan/Desktop/Current_OpsTowerV1_2026

# Hourly database backup (at :00 minutes)
0 * * * * cd $PROJECT_DIR && ./scripts/backup-database.sh >> /var/log/opstower/backup.log 2>&1

# Weekly backup verification (Sunday at 2 AM)
0 2 * * 0 cd $PROJECT_DIR && ./scripts/verify-backup.sh /var/backups/opstower/opstower_latest.sql.gz >> /var/log/opstower/verify.log 2>&1

# Backup health check (every 15 minutes)
*/15 * * * * cd $PROJECT_DIR && /usr/local/bin/check-backup-health.sh >> /var/log/opstower/health.log 2>&1
```

#### Option B: System Crontab (Recommended for Production)

```bash
# Edit system crontab
sudo crontab -e -u opstower

# Add the following entries:
```

```cron
# OpsTower Production Backup Schedule
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
MAILTO=ops@opstower.com
PROJECT_DIR=/opt/opstower

# Hourly backup
0 * * * * cd $PROJECT_DIR && ./scripts/backup-database.sh >> /var/log/opstower/backup.log 2>&1 || echo "Backup failed" | mail -s "ALERT: OpsTower Backup Failed" ops@opstower.com

# Weekly verification with full test
0 2 * * 0 cd $PROJECT_DIR && ./scripts/verify-backup.sh /var/backups/opstower/opstower_latest.sql.gz --full-test >> /var/log/opstower/verify.log 2>&1

# Daily S3 sync verification
0 3 * * * cd $PROJECT_DIR && aws s3 ls s3://opstower-backups/database/ --recursive --human-readable | tail -10 >> /var/log/opstower/s3-sync.log 2>&1
```

### Step 5: Verify Cron Configuration

```bash
# List current cron jobs
crontab -l

# Expected output should show all backup jobs

# Check cron service status
# Linux:
sudo systemctl status cron

# macOS:
sudo launchctl list | grep cron

# Test cron execution (run backup at next scheduled time)
# Monitor log file:
tail -f /var/log/opstower/backup.log
```

### Step 6: Monitor First Automated Backup

```bash
# Wait for next hourly backup (at :00 minutes)
# Watch log in real-time
tail -f /var/log/opstower/backup.log

# After backup completes, verify:
ls -lth /var/backups/opstower/*.sql.gz | head -5

# Check S3 upload
aws s3 ls s3://opstower-backups/database/$(date +%Y%m%d)/ --human-readable

# Verify backup age
stat -f "%Sm %N" /var/backups/opstower/opstower_latest.sql.gz
```

---

## Systemd Timer Setup (Alternative)

For systemd-based Linux systems, timers provide more control than cron.

### Step 1: Create Backup Service

Create `/etc/systemd/system/opstower-backup.service`:

```ini
[Unit]
Description=OpsTower Database Backup Service
Documentation=https://github.com/nathant30/Current_OpsTowerV1_2026
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=oneshot
User=opstower
Group=opstower
WorkingDirectory=/opt/opstower
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=/opt/opstower/.env
ExecStart=/opt/opstower/scripts/backup-database.sh
StandardOutput=journal
StandardError=journal
SyslogIdentifier=opstower-backup

# Security settings
PrivateTmp=yes
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/backups/opstower

[Install]
WantedBy=multi-user.target
```

### Step 2: Create Backup Timer

Create `/etc/systemd/system/opstower-backup.timer`:

```ini
[Unit]
Description=OpsTower Hourly Backup Timer
Documentation=https://github.com/nathant30/Current_OpsTowerV1_2026
Requires=opstower-backup.service

[Timer]
# Run hourly at :00 minutes
OnCalendar=hourly
# Ensure timer runs if system was off
Persistent=true
# Random delay to prevent all timers firing simultaneously
RandomizedDelaySec=5min

[Install]
WantedBy=timers.target
```

### Step 3: Create Verification Service

Create `/etc/systemd/system/opstower-verify.service`:

```ini
[Unit]
Description=OpsTower Backup Verification Service
Documentation=https://github.com/nathant30/Current_OpsTowerV1_2026
After=network.target postgresql.service

[Service]
Type=oneshot
User=opstower
Group=opstower
WorkingDirectory=/opt/opstower
EnvironmentFile=/opt/opstower/.env
ExecStart=/opt/opstower/scripts/verify-backup.sh /var/backups/opstower/opstower_latest.sql.gz --full-test
StandardOutput=journal
StandardError=journal
SyslogIdentifier=opstower-verify

[Install]
WantedBy=multi-user.target
```

### Step 4: Create Verification Timer

Create `/etc/systemd/system/opstower-verify.timer`:

```ini
[Unit]
Description=OpsTower Weekly Backup Verification Timer
Requires=opstower-verify.service

[Timer]
# Run weekly on Sunday at 2 AM
OnCalendar=Sun *-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Step 5: Enable and Start Timers

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable timers (start on boot)
sudo systemctl enable opstower-backup.timer
sudo systemctl enable opstower-verify.timer

# Start timers immediately
sudo systemctl start opstower-backup.timer
sudo systemctl start opstower-verify.timer

# Verify timers are active
sudo systemctl status opstower-backup.timer
sudo systemctl status opstower-verify.timer

# List all timers
sudo systemctl list-timers --all | grep opstower
```

### Step 6: Test Service Execution

```bash
# Manually trigger backup service (for testing)
sudo systemctl start opstower-backup.service

# Check service status
sudo systemctl status opstower-backup.service

# View logs
sudo journalctl -u opstower-backup.service -n 100 --no-pager

# View timer logs
sudo journalctl -u opstower-backup.timer -n 50 --no-pager
```

---

## Monitoring Configuration

### Health Check Script

Create `/usr/local/bin/check-backup-health.sh`:

```bash
#!/bin/bash

################################################################################
# OpsTower Backup Health Check Script
#
# Purpose: Monitor backup age and alert if backups are stale
# Usage: Called by cron every 15 minutes
################################################################################

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/opstower"
MAX_AGE_HOURS=2
ALERT_EMAIL="${ALERT_EMAIL:-ops@opstower.com}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Find latest backup
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/opstower_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "CRITICAL: No backups found in $BACKUP_DIR"
    # Send alert
    exit 2
fi

# Calculate backup age
BACKUP_TIMESTAMP=$(stat -f %m "$LATEST_BACKUP" 2>/dev/null || stat -c %Y "$LATEST_BACKUP")
CURRENT_TIMESTAMP=$(date +%s)
BACKUP_AGE_SECONDS=$((CURRENT_TIMESTAMP - BACKUP_TIMESTAMP))
BACKUP_AGE_HOURS=$((BACKUP_AGE_SECONDS / 3600))
BACKUP_AGE_MINUTES=$(((BACKUP_AGE_SECONDS % 3600) / 60))

# Get backup size
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)

# Check if backup is too old
if [ $BACKUP_AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    STATUS="CRITICAL"
    MESSAGE="Backup is ${BACKUP_AGE_HOURS}h ${BACKUP_AGE_MINUTES}m old (threshold: ${MAX_AGE_HOURS}h)"
    EXIT_CODE=2
elif [ $BACKUP_AGE_HOURS -gt 1 ]; then
    STATUS="WARNING"
    MESSAGE="Backup is ${BACKUP_AGE_HOURS}h ${BACKUP_AGE_MINUTES}m old"
    EXIT_CODE=1
else
    STATUS="OK"
    MESSAGE="Backup is ${BACKUP_AGE_MINUTES}m old, size: ${BACKUP_SIZE}"
    EXIT_CODE=0
fi

# Log to syslog
logger -t opstower-backup-health "${STATUS}: ${MESSAGE}"

# Send Slack notification if critical
if [ "$EXIT_CODE" -eq 2 ] && [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"🚨 OpsTower Backup Alert\",
            \"attachments\": [{
                \"color\": \"danger\",
                \"title\": \"${STATUS}\",
                \"text\": \"${MESSAGE}\",
                \"fields\": [{
                    \"title\": \"Latest Backup\",
                    \"value\": \"$(basename $LATEST_BACKUP)\",
                    \"short\": true
                }, {
                    \"title\": \"Size\",
                    \"value\": \"${BACKUP_SIZE}\",
                    \"short\": true
                }],
                \"ts\": $(date +%s)
            }]
        }" 2>/dev/null || true
fi

# Send email if critical
if [ "$EXIT_CODE" -eq 2 ] && [ -n "$ALERT_EMAIL" ]; then
    echo "${MESSAGE}" | mail -s "CRITICAL: OpsTower Backup Alert" "$ALERT_EMAIL" 2>/dev/null || true
fi

# Output for monitoring systems
echo "${STATUS}: ${MESSAGE}"
exit $EXIT_CODE
```

Make script executable:

```bash
sudo chmod +x /usr/local/bin/check-backup-health.sh
```

### Backup Success Monitoring Script

Create `/usr/local/bin/check-backup-success.sh`:

```bash
#!/bin/bash

################################################################################
# OpsTower Backup Success Rate Monitor
#
# Purpose: Track backup success rate over last 7 days
# Alert if success rate drops below 95%
################################################################################

set -euo pipefail

BACKUP_LOG="/var/log/opstower/backup.log"
MIN_SUCCESS_RATE=95

# Count successful and failed backups in last 7 days
TOTAL_BACKUPS=$(grep -c "OpsTower Database Backup - Started" "$BACKUP_LOG" 2>/dev/null || echo "0")
SUCCESSFUL_BACKUPS=$(grep -c "OpsTower Database Backup - Completed Successfully" "$BACKUP_LOG" 2>/dev/null || echo "0")

if [ "$TOTAL_BACKUPS" -eq 0 ]; then
    echo "WARNING: No backup runs found in log"
    exit 1
fi

# Calculate success rate
SUCCESS_RATE=$((SUCCESSFUL_BACKUPS * 100 / TOTAL_BACKUPS))

if [ "$SUCCESS_RATE" -lt "$MIN_SUCCESS_RATE" ]; then
    STATUS="CRITICAL"
    EXIT_CODE=2
else
    STATUS="OK"
    EXIT_CODE=0
fi

MESSAGE="Backup success rate: ${SUCCESS_RATE}% (${SUCCESSFUL_BACKUPS}/${TOTAL_BACKUPS})"

logger -t opstower-backup-success "${STATUS}: ${MESSAGE}"
echo "${STATUS}: ${MESSAGE}"

exit $EXIT_CODE
```

### Monitoring Dashboard Queries

For integration with monitoring systems (Grafana, Datadog, etc.):

```sql
-- Create backup_logs table (optional)
CREATE TABLE IF NOT EXISTS backup_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL, -- 'success', 'failed'
    duration_seconds INTEGER,
    backup_size_bytes BIGINT,
    backup_file VARCHAR(255),
    error_message TEXT,
    s3_uploaded BOOLEAN DEFAULT false
);

-- Query: Backup success rate (last 7 days)
SELECT
    DATE_TRUNC('day', timestamp) as day,
    COUNT(*) as total_backups,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
    ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM backup_logs
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY day DESC;

-- Query: Average backup duration
SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    AVG(duration_seconds) as avg_duration_sec,
    MAX(duration_seconds) as max_duration_sec,
    MIN(duration_seconds) as min_duration_sec
FROM backup_logs
WHERE status = 'success'
AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- Query: Backup size trend
SELECT
    DATE_TRUNC('day', timestamp) as day,
    AVG(backup_size_bytes / 1024 / 1024) as avg_size_mb,
    MAX(backup_size_bytes / 1024 / 1024) as max_size_mb
FROM backup_logs
WHERE status = 'success'
AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY day DESC;

-- Query: Failed backups (last 7 days)
SELECT
    timestamp,
    duration_seconds,
    error_message,
    backup_file
FROM backup_logs
WHERE status = 'failed'
AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

---

## Alert Configuration

### Slack Webhook Integration

#### Step 1: Create Slack Webhook

1. Go to: https://api.slack.com/messaging/webhooks
2. Create new webhook for #ops-alerts channel
3. Copy webhook URL

#### Step 2: Configure Environment Variable

Add to `.env`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### Step 3: Test Slack Notification

```bash
# Test Slack alert
curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d '{
        "text": "Test: OpsTower Backup System",
        "attachments": [{
            "color": "good",
            "title": "Backup Test",
            "text": "Slack notifications are working correctly",
            "ts": '$(date +%s)'
        }]
    }'
```

### Email Alerts

#### Configure SMTP (Postfix)

```bash
# Install and configure postfix
sudo apt-get install postfix mailutils

# Configure SMTP relay
sudo nano /etc/postfix/main.cf

# Add:
relayhost = [smtp.gmail.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt

# Create password file
sudo nano /etc/postfix/sasl_passwd
# Add: [smtp.gmail.com]:587 your_email@gmail.com:app_password

# Secure and reload
sudo postmap /etc/postfix/sasl_passwd
sudo chmod 600 /etc/postfix/sasl_passwd*
sudo systemctl restart postfix

# Test email
echo "Test email from OpsTower" | mail -s "Test" ops@opstower.com
```

### PagerDuty Integration

For critical alerts:

```bash
# Add to backup script
send_pagerduty_alert() {
    local severity=$1
    local message=$2

    if [ -n "${PAGERDUTY_SERVICE_KEY:-}" ]; then
        curl -X POST https://events.pagerduty.com/v2/enqueue \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"$PAGERDUTY_SERVICE_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"OpsTower Backup Alert\",
                    \"severity\": \"$severity\",
                    \"source\": \"opstower-backup\",
                    \"custom_details\": {
                        \"message\": \"$message\"
                    }
                }
            }"
    fi
}
```

---

## Testing & Verification

### Test Checklist

After setting up automation, verify:

- [ ] **Cron/Timer Configuration**
  - [ ] Cron jobs listed correctly (`crontab -l`)
  - [ ] Timers enabled (`systemctl list-timers`)
  - [ ] Log files created with correct permissions

- [ ] **First Automated Backup**
  - [ ] Wait for next scheduled backup
  - [ ] Verify backup file created
  - [ ] Check backup log for success
  - [ ] Confirm S3 upload completed

- [ ] **Monitoring**
  - [ ] Health check runs every 15 minutes
  - [ ] Slack notifications working
  - [ ] Email alerts configured

- [ ] **Log Rotation**
  - [ ] Logrotate configuration applied
  - [ ] Old logs compressed

### Manual Test Procedure

```bash
# 1. Trigger backup manually
sudo -u opstower /opt/opstower/scripts/backup-database.sh

# 2. Verify backup created
ls -lh /var/backups/opstower/opstower_latest.sql.gz

# 3. Check backup age
./usr/local/bin/check-backup-health.sh

# 4. Run verification
./scripts/verify-backup.sh /var/backups/opstower/opstower_latest.sql.gz

# 5. Test restore (in staging environment only!)
./scripts/restore-database.sh /var/backups/opstower/opstower_latest.sql.gz --force

# 6. Check logs
tail -50 /var/log/opstower/backup.log
tail -50 /var/log/opstower/verify.log
```

---

## Troubleshooting

### Issue: Cron Job Not Running

**Symptoms**:
- No backup files created at scheduled time
- No entries in log file

**Diagnosis**:
```bash
# Check cron service
sudo systemctl status cron  # Linux
sudo launchctl list | grep cron  # macOS

# Check cron logs
grep CRON /var/log/syslog  # Linux
log show --predicate 'process == "cron"' --last 1h  # macOS

# Verify crontab
crontab -l
```

**Solutions**:
1. Ensure cron service is running
2. Check script paths are absolute
3. Verify environment variables in crontab
4. Check script permissions (`chmod +x`)
5. Test script manually as cron user

### Issue: Backup Script Fails

**Symptoms**:
- Error in backup log
- No backup file created

**Diagnosis**:
```bash
# Check last error
tail -100 /var/log/opstower/backup.log | grep ERROR

# Test script manually
sudo -u opstower /opt/opstower/scripts/backup-database.sh

# Check database connection
psql -h localhost -U opstower_user -d opstower -c "SELECT 1"

# Check disk space
df -h /var/backups/opstower
```

**Common Causes**:
- Insufficient disk space
- Database connection failure
- Missing PostgreSQL tools
- Incorrect credentials in `.env`

### Issue: S3 Upload Fails

**Symptoms**:
- Backup succeeds but S3 upload fails
- Error: "Failed to upload backup to S3"

**Diagnosis**:
```bash
# Test AWS CLI
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://opstower-backups/

# Check AWS credentials
cat ~/.aws/credentials
```

**Solutions**:
1. Verify AWS credentials in `.env`
2. Check IAM permissions (s3:PutObject)
3. Verify bucket exists and is accessible
4. Use `--local-only` flag temporarily

### Issue: Verification Fails

**Symptoms**:
- Verification script reports failures
- Tests not passing

**Diagnosis**:
```bash
# Run verification with verbose output
./scripts/verify-backup.sh /var/backups/opstower/opstower_latest.sql.gz

# Check backup integrity
gzip -t /var/backups/opstower/opstower_latest.sql.gz

# View backup header
gunzip -c /var/backups/opstower/opstower_latest.sql.gz | head -100
```

**Solutions**:
1. Ensure backup file is complete
2. Check for disk corruption
3. Re-run backup script
4. Try older backup file

---

## Maintenance

### Weekly Tasks

- [ ] Review backup logs for errors
- [ ] Verify latest backup age (< 1 hour)
- [ ] Check S3 bucket size and costs
- [ ] Monitor disk space usage

### Monthly Tasks

- [ ] Run full backup verification with `--full-test`
- [ ] Review backup success rate (should be > 95%)
- [ ] Test restore procedure in staging
- [ ] Update documentation if needed

### Quarterly Tasks

- [ ] Execute full DR drill
- [ ] Measure actual RTO/RPO
- [ ] Review and update runbooks
- [ ] Audit backup retention policies

---

## Production Deployment Checklist

Final checklist before going live:

- [ ] ✅ All scripts tested manually
- [ ] ✅ Cron jobs configured and tested
- [ ] ✅ First automated backup successful
- [ ] ✅ S3 upload working
- [ ] ✅ Monitoring configured
- [ ] ✅ Alerts tested (Slack/email)
- [ ] ✅ Log rotation configured
- [ ] ✅ Documentation updated
- [ ] ✅ Team trained on procedures
- [ ] ✅ Runbooks reviewed

---

## References

- [Backup & Recovery Guide](./BACKUP_RECOVERY.md)
- [Disaster Recovery Runbook](./DR_RUNBOOK.md)
- [Backup Testing Report](./BACKUP_TESTING_REPORT.md)

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-07
**Maintained By**: Docs & Git Coordinator
