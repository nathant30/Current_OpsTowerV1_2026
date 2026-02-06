#!/bin/bash

################################################################################
# OpsTower Database Backup Script
#
# Purpose: Automated PostgreSQL database backup with S3 upload and verification
# RTO: 4 hours | RPO: 1 hour
#
# Usage: ./scripts/backup-database.sh [--local-only]
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    source "$PROJECT_ROOT/.env.local"
elif [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
else
    echo -e "${RED}Error: No .env file found${NC}"
    exit 1
fi

# Default values if not set in .env
BACKUP_DIR="${BACKUP_DIR:-/var/backups/opstower}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LOCAL_ONLY=false

# Parse arguments
if [[ "${1:-}" == "--local-only" ]]; then
    LOCAL_ONLY=true
fi

# Backup file paths
BACKUP_FILE="${BACKUP_DIR}/opstower_${TIMESTAMP}.sql"
BACKUP_COMPRESSED="${BACKUP_DIR}/opstower_${TIMESTAMP}.sql.gz"
BACKUP_METADATA="${BACKUP_DIR}/opstower_${TIMESTAMP}.meta.json"
LATEST_LINK="${BACKUP_DIR}/opstower_latest.sql.gz"

################################################################################
# Functions
################################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Check if backup directory exists, create if not
    if [ ! -d "$BACKUP_DIR" ]; then
        log_warn "Backup directory does not exist. Creating: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi

    # Check disk space (require at least 5GB free)
    REQUIRED_SPACE=$((5 * 1024 * 1024)) # 5GB in KB
    AVAILABLE_SPACE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')

    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        log_error "Insufficient disk space. Required: 5GB, Available: $((AVAILABLE_SPACE / 1024 / 1024))GB"
        exit 1
    fi

    # Check if AWS CLI is available (for S3 upload)
    if [ "$LOCAL_ONLY" = false ] && ! command -v aws &> /dev/null; then
        log_warn "AWS CLI not found. Will only create local backup."
        LOCAL_ONLY=true
    fi

    log_info "Prerequisites check passed"
}

create_backup() {
    log_info "Starting database backup..."

    # Extract database connection details
    DB_HOST="${DATABASE_HOST:-localhost}"
    DB_PORT="${DATABASE_PORT:-5432}"
    DB_NAME="${DATABASE_NAME:-opstower}"
    DB_USER="${DATABASE_USER:-postgres}"

    # Set password for pg_dump
    export PGPASSWORD="$DATABASE_PASSWORD"

    # Create backup with verbose output
    log_info "Dumping database to: $BACKUP_FILE"

    if pg_dump -h "$DB_HOST" \
               -p "$DB_PORT" \
               -U "$DB_USER" \
               -d "$DB_NAME" \
               --format=plain \
               --no-owner \
               --no-acl \
               --verbose \
               --file="$BACKUP_FILE" 2>&1 | tee "${BACKUP_DIR}/backup_${TIMESTAMP}.log"; then
        log_info "Database dump completed successfully"
    else
        log_error "Database dump failed"
        unset PGPASSWORD
        exit 1
    fi

    # Unset password
    unset PGPASSWORD

    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup size: $BACKUP_SIZE"
}

compress_backup() {
    log_info "Compressing backup..."

    if gzip -c "$BACKUP_FILE" > "$BACKUP_COMPRESSED"; then
        log_info "Compression completed successfully"

        # Remove uncompressed file to save space
        rm "$BACKUP_FILE"

        COMPRESSED_SIZE=$(du -h "$BACKUP_COMPRESSED" | cut -f1)
        log_info "Compressed size: $COMPRESSED_SIZE"
    else
        log_error "Compression failed"
        exit 1
    fi
}

create_metadata() {
    log_info "Creating backup metadata..."

    # Get database statistics
    export PGPASSWORD="$DATABASE_PASSWORD"

    DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
              -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)

    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

    unset PGPASSWORD

    # Create metadata JSON
    cat > "$BACKUP_METADATA" <<METADATA
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "port": $DB_PORT,
  "backup_file": "$(basename "$BACKUP_COMPRESSED")",
  "backup_size": "$(du -b "$BACKUP_COMPRESSED" | cut -f1)",
  "database_size": "$DB_SIZE",
  "table_count": $TABLE_COUNT,
  "compression": "gzip",
  "postgresql_version": "$(psql --version | head -1)",
  "backup_script_version": "1.0.0",
  "retention_days": $BACKUP_RETENTION_DAYS
}
METADATA

    log_info "Metadata created: $BACKUP_METADATA"
}

verify_backup() {
    log_info "Verifying backup integrity..."

    # Test gzip integrity
    if gzip -t "$BACKUP_COMPRESSED" 2>/dev/null; then
        log_info "Backup file integrity verified (gzip test passed)"
    else
        log_error "Backup file is corrupted (gzip test failed)"
        exit 1
    fi

    # Check if file is not empty
    if [ ! -s "$BACKUP_COMPRESSED" ]; then
        log_error "Backup file is empty"
        exit 1
    fi

    # Verify backup contains SQL commands
    if gunzip -c "$BACKUP_COMPRESSED" | head -100 | grep -q "PostgreSQL database dump"; then
        log_info "Backup content verified (valid PostgreSQL dump)"
    else
        log_error "Backup file does not appear to be a valid PostgreSQL dump"
        exit 1
    fi

    log_info "Backup verification completed successfully"
}

upload_to_s3() {
    if [ "$LOCAL_ONLY" = true ]; then
        log_info "Skipping S3 upload (local-only mode)"
        return 0
    fi

    log_info "Uploading backup to S3..."

    if [ -z "${BACKUP_S3_BUCKET:-}" ]; then
        log_warn "BACKUP_S3_BUCKET not configured. Skipping S3 upload."
        return 0
    fi

    S3_PATH="s3://${BACKUP_S3_BUCKET}/database/${DATE_ONLY}/$(basename "$BACKUP_COMPRESSED")"
    S3_METADATA_PATH="s3://${BACKUP_S3_BUCKET}/database/${DATE_ONLY}/$(basename "$BACKUP_METADATA")"

    # Upload backup file
    if aws s3 cp "$BACKUP_COMPRESSED" "$S3_PATH" \
           --region "${AWS_REGION:-ap-southeast-1}" \
           --storage-class STANDARD_IA \
           --metadata "timestamp=$TIMESTAMP,database=$DB_NAME"; then
        log_info "Backup uploaded to S3: $S3_PATH"
    else
        log_error "Failed to upload backup to S3"
        exit 1
    fi

    # Upload metadata file
    if aws s3 cp "$BACKUP_METADATA" "$S3_METADATA_PATH" \
           --region "${AWS_REGION:-ap-southeast-1}"; then
        log_info "Metadata uploaded to S3: $S3_METADATA_PATH"
    else
        log_warn "Failed to upload metadata to S3"
    fi

    # Verify S3 upload
    if aws s3 ls "$S3_PATH" > /dev/null 2>&1; then
        log_info "S3 upload verified"
    else
        log_error "S3 upload verification failed"
        exit 1
    fi
}

cleanup_old_backups() {
    log_info "Cleaning up old backups (retention: ${BACKUP_RETENTION_DAYS} days)..."

    # Remove local backups older than retention period
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "opstower_*.sql.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete -print | wc -l | xargs)

    if [ "$DELETED_COUNT" -gt 0 ]; then
        log_info "Deleted $DELETED_COUNT old local backup(s)"
    else
        log_info "No old local backups to delete"
    fi

    # Remove old metadata files
    find "$BACKUP_DIR" -name "opstower_*.meta.json" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete
    find "$BACKUP_DIR" -name "backup_*.log" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete

    # Clean up old S3 backups if configured
    if [ "$LOCAL_ONLY" = false ] && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
        log_info "Cleaning up old S3 backups..."

        CUTOFF_DATE=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y%m%d 2>/dev/null || date -v-${BACKUP_RETENTION_DAYS}d +%Y%m%d)

        aws s3 ls "s3://${BACKUP_S3_BUCKET}/database/" --recursive | \
        awk '{print $4}' | \
        while read -r key; do
            FILE_DATE=$(echo "$key" | grep -oE '[0-9]{8}' | head -1)
            if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
                aws s3 rm "s3://${BACKUP_S3_BUCKET}/$key" && \
                log_info "Deleted old S3 backup: $key"
            fi
        done
    fi
}

update_latest_link() {
    log_info "Updating latest backup symlink..."

    # Remove old symlink if exists
    [ -L "$LATEST_LINK" ] && rm "$LATEST_LINK"

    # Create new symlink
    ln -s "$BACKUP_COMPRESSED" "$LATEST_LINK"

    log_info "Latest backup link updated: $LATEST_LINK"
}

send_notification() {
    local status=$1
    local message=$2

    # Log to system log
    logger -t opstower-backup "$status: $message"

    # Could integrate with monitoring systems here
    # Example: curl -X POST webhook_url -d "status=$status&message=$message"
}

################################################################################
# Main execution
################################################################################

main() {
    log_info "==================================================================="
    log_info "OpsTower Database Backup - Started"
    log_info "==================================================================="
    log_info "Timestamp: $TIMESTAMP"
    log_info "Database: ${DATABASE_NAME:-opstower}"
    log_info "Backup Directory: $BACKUP_DIR"
    log_info "Local Only: $LOCAL_ONLY"
    log_info "==================================================================="

    START_TIME=$(date +%s)

    # Execute backup workflow
    check_prerequisites
    create_backup
    compress_backup
    create_metadata
    verify_backup
    upload_to_s3
    cleanup_old_backups
    update_latest_link

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    log_info "==================================================================="
    log_info "OpsTower Database Backup - Completed Successfully"
    log_info "==================================================================="
    log_info "Duration: ${DURATION} seconds"
    log_info "Backup File: $BACKUP_COMPRESSED"
    log_info "Backup Size: $(du -h "$BACKUP_COMPRESSED" | cut -f1)"
    log_info "==================================================================="

    send_notification "SUCCESS" "Database backup completed in ${DURATION}s"
}

# Run main function
main "$@"
