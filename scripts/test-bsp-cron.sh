#!/bin/bash

# BSP Cron Job Test Script
# Tests the automated BSP daily report generation endpoint

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:4000}"
CRON_SECRET="${CRON_SECRET:-dev-secret-change-in-production}"

echo "=========================================="
echo "BSP Daily Report Cron Job Test"
echo "=========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Endpoint: /api/cron/bsp-daily"
echo ""

# Test 1: Unauthorized Request (should fail with 401)
echo "Test 1: Unauthorized request..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/cron/bsp-daily")

if [ "$HTTP_CODE" = "401" ]; then
    echo "✓ PASS: Unauthorized request blocked (401)"
else
    echo "✗ FAIL: Expected 401, got $HTTP_CODE"
fi
echo ""

# Test 2: Authorized POST Request (manual trigger)
echo "Test 2: Authorized manual trigger..."
RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json" \
    "$BASE_URL/api/cron/bsp-daily")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✓ PASS: Report generated successfully"

    # Extract report ID
    REPORT_ID=$(echo "$RESPONSE" | grep -o '"reportId":"[^"]*"' | cut -d'"' -f4)
    echo "Report ID: $REPORT_ID"
else
    echo "✗ FAIL: Report generation failed"
fi
echo ""

# Test 3: Check database for report
echo "Test 3: Verify database record..."
echo "(Run manually: SELECT * FROM bsp_report_submissions ORDER BY created_at DESC LIMIT 1;)"
echo ""

# Test 4: Check file created (if not serverless)
echo "Test 4: Check report file..."
YESTERDAY=$(date -u -d "yesterday" +%Y-%m-%d 2>/dev/null || date -u -v-1d +%Y-%m-%d)
REPORT_PATH="/var/opstower/reports/bsp/bsp_daily_report_${YESTERDAY}.csv"

if [ -f "$REPORT_PATH" ]; then
    echo "✓ PASS: Report file exists at $REPORT_PATH"
    echo "File size: $(wc -c < "$REPORT_PATH") bytes"
    echo "Line count: $(wc -l < "$REPORT_PATH") lines"
else
    echo "⚠ WARNING: Report file not found (expected in serverless environment)"
    echo "Expected path: $REPORT_PATH"
fi
echo ""

# Test 5: Verify file hash integrity (if file exists)
if [ -f "$REPORT_PATH" ]; then
    echo "Test 5: Verify file hash..."
    FILE_HASH=$(sha256sum "$REPORT_PATH" | cut -d' ' -f1)
    echo "SHA-256: $FILE_HASH"
    echo "(Compare with file_hash in database)"
    echo ""
fi

echo "=========================================="
echo "Tests Complete"
echo "=========================================="
echo ""
echo "Manual verification steps:"
echo "1. Check database: SELECT * FROM bsp_report_submissions ORDER BY created_at DESC LIMIT 1;"
echo "2. Check daily summary: SELECT * FROM bsp_daily_summary WHERE summary_date = CURRENT_DATE - INTERVAL '1 day';"
echo "3. Check logs for 'BSP daily report generated successfully'"
echo "4. Visit UI: $BASE_URL/compliance/bsp/reports"
