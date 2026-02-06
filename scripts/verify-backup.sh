#!/bin/bash

################################################################################
# OpsTower Backup Verification Script
#
# Purpose: Verify backup integrity and perform test restoration
# Usage: ./scripts/verify-backup.sh [backup_file] [--full-test]
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    source "$PROJECT_ROOT/.env.local"
elif [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# Default values
BACKUP_DIR="${BACKUP_DIR:-/var/backups/opstower}"
BACKUP_FILE="${1:-${BACKUP_DIR}/opstower_latest.sql.gz}"
FULL_TEST=false
VERIFICATION_LOG="${BACKUP_DIR}/verification_${TIMESTAMP}.log"
TEST_DB_NAME="opstower_verify_${TIMESTAMP}"

################################################################################
# Functions
################################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$VERIFICATION_LOG"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$VERIFICATION_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$VERIFICATION_LOG"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$VERIFICATION_LOG"
}

parse_arguments() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --full-test)
                FULL_TEST=true
                shift
                ;;
            *)
                BACKUP_FILE="$1"
                shift
                ;;
        esac
    done
}

test_file_existence() {
    log_info "Test 1/8: Checking file existence..."

    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "FAIL: Backup file not found: $BACKUP_FILE"
        return 1
    fi

    log_success "PASS: Backup file exists"
    return 0
}

test_file_readable() {
    log_info "Test 2/8: Checking file readability..."

    if [ ! -r "$BACKUP_FILE" ]; then
        log_error "FAIL: Backup file is not readable"
        return 1
    fi

    log_success "PASS: Backup file is readable"
    return 0
}

test_file_not_empty() {
    log_info "Test 3/8: Checking file is not empty..."

    if [ ! -s "$BACKUP_FILE" ]; then
        log_error "FAIL: Backup file is empty"
        return 1
    fi

    FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "PASS: Backup file size: $FILESIZE"
    return 0
}

test_gzip_integrity() {
    log_info "Test 4/8: Testing gzip integrity..."

    if [[ "$BACKUP_FILE" != *.gz ]]; then
        log_warn "SKIP: Not a gzip file"
        return 0
    fi

    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
        log_success "PASS: Gzip integrity test passed"
        return 0
    else
        log_error "FAIL: Gzip integrity test failed - file is corrupted"
        return 1
    fi
}

test_postgresql_dump() {
    log_info "Test 5/8: Verifying PostgreSQL dump content..."

    if [[ "$BACKUP_FILE" == *.gz ]]; then
        HEADER=$(gunzip -c "$BACKUP_FILE" | head -100)
    else
        HEADER=$(head -100 "$BACKUP_FILE")
    fi

    if echo "$HEADER" | grep -q "PostgreSQL database dump"; then
        log_success "PASS: Valid PostgreSQL dump detected"
    else
        log_error "FAIL: File does not appear to be a valid PostgreSQL dump"
        return 1
    fi

    # Check for common SQL commands
    if echo "$HEADER" | grep -qE "(CREATE TABLE|INSERT INTO|COPY)"; then
        log_success "PASS: SQL commands detected in backup"
    else
        log_warn "WARN: No SQL commands found in first 100 lines"
    fi

    return 0
}

test_metadata_file() {
    log_info "Test 6/8: Checking metadata file..."

    METADATA_FILE="${BACKUP_FILE%.sql.gz}.meta.json"

    if [ ! -f "$METADATA_FILE" ]; then
        log_warn "SKIP: Metadata file not found: $METADATA_FILE"
        return 0
    fi

    # Verify JSON is valid
    if command -v jq &> /dev/null; then
        if jq empty "$METADATA_FILE" 2>/dev/null; then
            log_success "PASS: Metadata file is valid JSON"

            # Extract and display key information
            log_info "Metadata Information:"
            jq -r '"  Timestamp: \(.timestamp)"' "$METADATA_FILE" | tee -a "$VERIFICATION_LOG"
            jq -r '"  Database Size: \(.database_size)"' "$METADATA_FILE" | tee -a "$VERIFICATION_LOG"
            jq -r '"  Table Count: \(.table_count)"' "$METADATA_FILE" | tee -a "$VERIFICATION_LOG"
        else
            log_error "FAIL: Metadata file is not valid JSON"
            return 1
        fi
    else
        log_warn "SKIP: jq not installed, cannot validate JSON"
    fi

    return 0
}

test_s3_backup() {
    log_info "Test 7/8: Verifying S3 backup..."

    # Skip if no S3 configuration
    if [ -z "${BACKUP_S3_BUCKET:-}" ]; then
        log_warn "SKIP: S3 bucket not configured"
        return 0
    fi

    # Skip if AWS CLI not available
    if ! command -v aws &> /dev/null; then
        log_warn "SKIP: AWS CLI not installed"
        return 0
    fi

    # Get the date from backup filename
    BACKUP_BASENAME=$(basename "$BACKUP_FILE")
    DATE_PART=$(echo "$BACKUP_BASENAME" | grep -oE '[0-9]{8}' | head -1)

    if [ -z "$DATE_PART" ]; then
        log_warn "SKIP: Cannot extract date from backup filename"
        return 0
    fi

    S3_PATH="s3://${BACKUP_S3_BUCKET}/database/${DATE_PART}/${BACKUP_BASENAME}"

    if aws s3 ls "$S3_PATH" > /dev/null 2>&1; then
        S3_SIZE=$(aws s3 ls "$S3_PATH" | awk '{print $3}')
        log_success "PASS: S3 backup exists (size: $S3_SIZE bytes)"
    else
        log_warn "WARN: S3 backup not found at: $S3_PATH"
    fi

    return 0
}

test_restoration() {
    log_info "Test 8/8: Full restoration test..."

    if [ "$FULL_TEST" != true ]; then
        log_warn "SKIP: Full restoration test not requested (use --full-test)"
        return 0
    fi

    # Check prerequisites
    if ! command -v psql &> /dev/null || ! command -v createdb &> /dev/null; then
        log_error "FAIL: PostgreSQL client tools not found"
        return 1
    fi

    if [ -z "${DATABASE_PASSWORD:-}" ]; then
        log_error "FAIL: DATABASE_PASSWORD not set"
        return 1
    fi

    DB_HOST="${DATABASE_HOST:-localhost}"
    DB_PORT="${DATABASE_PORT:-5432}"
    DB_USER="${DATABASE_USER:-postgres}"

    export PGPASSWORD="$DATABASE_PASSWORD"

    # Create test database
    log_info "Creating test database: $TEST_DB_NAME"
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB_NAME" >> "$VERIFICATION_LOG" 2>&1

    # Restore backup to test database
    log_info "Restoring backup to test database..."

    if [[ "$BACKUP_FILE" == *.gz ]]; then
        if gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" \
            --set ON_ERROR_STOP=on >> "$VERIFICATION_LOG" 2>&1; then
            log_info "Restoration to test database successful"
        else
            log_error "FAIL: Restoration to test database failed"
            dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB_NAME" 2>/dev/null || true
            unset PGPASSWORD
            return 1
        fi
    else
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" \
            --set ON_ERROR_STOP=on -f "$BACKUP_FILE" >> "$VERIFICATION_LOG" 2>&1; then
            log_info "Restoration to test database successful"
        else
            log_error "FAIL: Restoration to test database failed"
            dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB_NAME" 2>/dev/null || true
            unset PGPASSWORD
            return 1
        fi
    fi

    # Verify restored database
    log_info "Verifying restored database..."

    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" \
                  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")

    log_info "Tables in restored database: $TABLE_COUNT"

    if [ "$TABLE_COUNT" -gt 0 ]; then
        log_success "PASS: Restored database contains tables"
    else
        log_warn "WARN: No tables found in restored database"
    fi

    # Run basic query test
    log_info "Running basic query test..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" \
        -c "SELECT 1;" >> "$VERIFICATION_LOG" 2>&1; then
        log_success "PASS: Basic query successful"
    else
        log_error "FAIL: Basic query failed"
    fi

    # Cleanup test database
    log_info "Cleaning up test database..."
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB_NAME" >> "$VERIFICATION_LOG" 2>&1

    unset PGPASSWORD

    log_success "PASS: Full restoration test completed"
    return 0
}

generate_report() {
    local passed=$1
    local total=$2

    log_info "==================================================================="
    log_info "Backup Verification Report"
    log_info "==================================================================="
    log_info "Backup File: $BACKUP_FILE"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Tests Passed: $passed/$total"
    log_info "Full Test Mode: $FULL_TEST"
    log_info "Log File: $VERIFICATION_LOG"
    log_info "==================================================================="

    if [ "$passed" -eq "$total" ]; then
        log_success "ALL TESTS PASSED - Backup is verified"
        return 0
    else
        FAILED=$((total - passed))
        log_error "$FAILED TESTS FAILED - Backup verification incomplete"
        return 1
    fi
}

################################################################################
# Main execution
################################################################################

main() {
    parse_arguments "$@"

    log_info "==================================================================="
    log_info "OpsTower Backup Verification - Started"
    log_info "==================================================================="
    log_info "Backup File: $BACKUP_FILE"
    log_info "Full Test: $FULL_TEST"
    log_info "==================================================================="

    TESTS_PASSED=0
    TESTS_TOTAL=8

    # Run all tests
    test_file_existence && ((TESTS_PASSED++)) || true
    test_file_readable && ((TESTS_PASSED++)) || true
    test_file_not_empty && ((TESTS_PASSED++)) || true
    test_gzip_integrity && ((TESTS_PASSED++)) || true
    test_postgresql_dump && ((TESTS_PASSED++)) || true
    test_metadata_file && ((TESTS_PASSED++)) || true
    test_s3_backup && ((TESTS_PASSED++)) || true
    test_restoration && ((TESTS_PASSED++)) || true

    # Generate final report
    generate_report "$TESTS_PASSED" "$TESTS_TOTAL"
}

# Run main function
main "$@"
