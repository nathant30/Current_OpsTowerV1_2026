#!/bin/bash

################################################################################
# OpsTower Database Restore Script
#
# Purpose: Restore PostgreSQL database from backup with verification
# RTO: 4 hours | RPO: 1 hour
#
# Usage: ./scripts/restore-database.sh <backup_file> [--from-s3] [--force]
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
else
    echo -e "${RED}Error: No .env file found${NC}"
    exit 1
fi

# Default values
BACKUP_DIR="${BACKUP_DIR:-/var/backups/opstower}"
FROM_S3=false
FORCE=false
BACKUP_FILE=""
RESTORE_LOG="${BACKUP_DIR}/restore_${TIMESTAMP}.log"

################################################################################
# Functions
################################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$RESTORE_LOG"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$RESTORE_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$RESTORE_LOG"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$RESTORE_LOG"
}

usage() {
    cat << EOF
Usage: $0 <backup_file> [options]

Options:
    --from-s3           Download backup from S3 before restoring
    --force             Skip confirmation prompt
    -h, --help          Show this help message

Examples:
    # Restore from local backup
    $0 /var/backups/opstower/opstower_20260207_120000.sql.gz

    # Restore from S3
    $0 database/20260207/opstower_20260207_120000.sql.gz --from-s3

    # Restore with force (no confirmation)
    $0 /var/backups/opstower/opstower_latest.sql.gz --force

EOF
    exit 1
}

parse_arguments() {
    if [ $# -eq 0 ]; then
        log_error "No backup file specified"
        usage
    fi

    BACKUP_FILE="$1"
    shift

    while [ $# -gt 0 ]; do
        case "$1" in
            --from-s3)
                FROM_S3=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done
}

check_prerequisites() {
    log_step "Checking prerequisites..."

    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Check if gunzip is available
    if ! command -v gunzip &> /dev/null; then
        log_error "gunzip not found. Please install gzip."
        exit 1
    fi

    # Check backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi

    # Check AWS CLI if downloading from S3
    if [ "$FROM_S3" = true ] && ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Required for --from-s3 option."
        exit 1
    fi

    log_info "Prerequisites check passed"
}

download_from_s3() {
    if [ "$FROM_S3" = false ]; then
        return 0
    fi

    log_step "Downloading backup from S3..."

    if [ -z "${BACKUP_S3_BUCKET:-}" ]; then
        log_error "BACKUP_S3_BUCKET not configured"
        exit 1
    fi

    S3_PATH="s3://${BACKUP_S3_BUCKET}/${BACKUP_FILE}"
    LOCAL_PATH="${BACKUP_DIR}/$(basename "$BACKUP_FILE")"

    log_info "Downloading from: $S3_PATH"
    log_info "Downloading to: $LOCAL_PATH"

    if aws s3 cp "$S3_PATH" "$LOCAL_PATH" --region "${AWS_REGION:-ap-southeast-1}"; then
        log_info "Download completed successfully"
        BACKUP_FILE="$LOCAL_PATH"
    else
        log_error "Failed to download backup from S3"
        exit 1
    fi
}

verify_backup_file() {
    log_step "Verifying backup file..."

    # Check if file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    # Check if file is readable
    if [ ! -r "$BACKUP_FILE" ]; then
        log_error "Backup file is not readable: $BACKUP_FILE"
        exit 1
    fi

    # Verify gzip integrity
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        if gzip -t "$BACKUP_FILE" 2>/dev/null; then
            log_info "Backup file integrity verified (gzip test passed)"
        else
            log_error "Backup file is corrupted (gzip test failed)"
            exit 1
        fi

        # Verify contains PostgreSQL dump
        if gunzip -c "$BACKUP_FILE" | head -100 | grep -q "PostgreSQL database dump"; then
            log_info "Backup content verified (valid PostgreSQL dump)"
        else
            log_error "Backup file does not appear to be a valid PostgreSQL dump"
            exit 1
        fi
    fi

    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup file size: $BACKUP_SIZE"
}

confirm_restore() {
    if [ "$FORCE" = true ]; then
        return 0
    fi

    log_warn "==================================================================="
    log_warn "WARNING: This will COMPLETELY REPLACE the current database!"
    log_warn "==================================================================="
    log_warn "Database: ${DATABASE_NAME:-opstower}"
    log_warn "Host: ${DATABASE_HOST:-localhost}"
    log_warn "Backup File: $BACKUP_FILE"
    log_warn "==================================================================="

    read -p "Are you sure you want to continue? (yes/no): " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
}

create_pre_restore_backup() {
    log_step "Creating pre-restore backup of current database..."

    PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_${TIMESTAMP}.sql.gz"

    DB_HOST="${DATABASE_HOST:-localhost}"
    DB_PORT="${DATABASE_PORT:-5432}"
    DB_NAME="${DATABASE_NAME:-opstower}"
    DB_USER="${DATABASE_USER:-postgres}"

    export PGPASSWORD="$DATABASE_PASSWORD"

    if pg_dump -h "$DB_HOST" \
               -p "$DB_PORT" \
               -U "$DB_USER" \
               -d "$DB_NAME" \
               --format=plain \
               --no-owner \
               --no-acl | gzip > "$PRE_RESTORE_BACKUP"; then
        log_info "Pre-restore backup created: $PRE_RESTORE_BACKUP"
    else
        log_error "Failed to create pre-restore backup"
        unset PGPASSWORD
        exit 1
    fi

    unset PGPASSWORD
}

terminate_connections() {
    log_step "Terminating existing database connections..."

    DB_HOST="${DATABASE_HOST:-localhost}"
    DB_PORT="${DATABASE_PORT:-5432}"
    DB_NAME="${DATABASE_NAME:-opstower}"
    DB_USER="${DATABASE_USER:-postgres}"

    export PGPASSWORD="$DATABASE_PASSWORD"

    # Terminate all connections except this one
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
        >> "$RESTORE_LOG" 2>&1 || true

    unset PGPASSWORD

    log_info "Existing connections terminated"
}

restore_database() {
    log_step "Restoring database from backup..."

    DB_HOST="${DATABASE_HOST:-localhost}"
    DB_PORT="${DATABASE_PORT:-5432}"
    DB_NAME="${DATABASE_NAME:-opstower}"
    DB_USER="${DATABASE_USER:-postgres}"

    export PGPASSWORD="$DATABASE_PASSWORD"

    # Drop existing database (if exists)
    log_info "Dropping existing database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "DROP DATABASE IF EXISTS $DB_NAME;" >> "$RESTORE_LOG" 2>&1

    # Create fresh database
    log_info "Creating fresh database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "CREATE DATABASE $DB_NAME;" >> "$RESTORE_LOG" 2>&1

    # Restore from backup
    log_info "Restoring data from backup..."

    if [[ "$BACKUP_FILE" == *.gz ]]; then
        if gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --set ON_ERROR_STOP=on >> "$RESTORE_LOG" 2>&1; then
            log_info "Database restore completed successfully"
        else
            log_error "Database restore failed. Check log: $RESTORE_LOG"
            unset PGPASSWORD
            exit 1
        fi
    else
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --set ON_ERROR_STOP=on -f "$BACKUP_FILE" >> "$RESTORE_LOG" 2>&1; then
            log_info "Database restore completed successfully"
        else
            log_error "Database restore failed. Check log: $RESTORE_LOG"
            unset PGPASSWORD
            exit 1
        fi
    fi

    unset PGPASSWORD
}

verify_restore() {
    log_step "Verifying restored database..."

    DB_HOST="${DATABASE_HOST:-localhost}"
    DB_PORT="${DATABASE_PORT:-5432}"
    DB_NAME="${DATABASE_NAME:-opstower}"
    DB_USER="${DATABASE_USER:-postgres}"

    export PGPASSWORD="$DATABASE_PASSWORD"

    # Check database exists
    DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
                -t -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | xargs)

    if [ "$DB_EXISTS" != "1" ]; then
        log_error "Database verification failed: database does not exist"
        unset PGPASSWORD
        exit 1
    fi

    # Get table count
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

    log_info "Table count: $TABLE_COUNT"

    if [ "$TABLE_COUNT" -eq 0 ]; then
        log_warn "No tables found in restored database"
    fi

    # Get database size
    DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
              -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)

    log_info "Database size: $DB_SIZE"

    # Run basic integrity checks
    log_info "Running integrity checks..."

    # Check for corrupted indexes
    CORRUPT_INDEXES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                      -t -c "SELECT COUNT(*) FROM pg_class WHERE relkind = 'i' AND relpages = 0;" | xargs)

    if [ "$CORRUPT_INDEXES" -gt 0 ]; then
        log_warn "Found $CORRUPT_INDEXES potentially corrupted indexes"
    else
        log_info "Index integrity check passed"
    fi

    unset PGPASSWORD

    log_info "Database verification completed"
}

run_post_restore_tasks() {
    log_step "Running post-restore tasks..."

    DB_HOST="${DATABASE_HOST:-localhost}"
    DB_PORT="${DATABASE_PORT:-5432}"
    DB_NAME="${DATABASE_NAME:-opstower}"
    DB_USER="${DATABASE_USER:-postgres}"

    export PGPASSWORD="$DATABASE_PASSWORD"

    # Analyze database for query planner
    log_info "Analyzing database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "ANALYZE;" >> "$RESTORE_LOG" 2>&1

    # Vacuum database
    log_info "Vacuuming database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "VACUUM;" >> "$RESTORE_LOG" 2>&1

    # Reindex if needed
    log_info "Reindexing database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "REINDEX DATABASE $DB_NAME;" >> "$RESTORE_LOG" 2>&1 || true

    unset PGPASSWORD

    log_info "Post-restore tasks completed"
}

send_notification() {
    local status=$1
    local message=$2

    # Log to system log
    logger -t opstower-restore "$status: $message"

    # Could integrate with monitoring systems here
}

################################################################################
# Main execution
################################################################################

main() {
    log_info "==================================================================="
    log_info "OpsTower Database Restore - Started"
    log_info "==================================================================="
    log_info "Timestamp: $TIMESTAMP"
    log_info "Database: ${DATABASE_NAME:-opstower}"
    log_info "Restore Log: $RESTORE_LOG"
    log_info "==================================================================="

    START_TIME=$(date +%s)

    parse_arguments "$@"
    check_prerequisites
    download_from_s3
    verify_backup_file
    confirm_restore
    create_pre_restore_backup
    terminate_connections
    restore_database
    verify_restore
    run_post_restore_tasks

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    log_info "==================================================================="
    log_info "OpsTower Database Restore - Completed Successfully"
    log_info "==================================================================="
    log_info "Duration: ${DURATION} seconds"
    log_info "Backup File: $BACKUP_FILE"
    log_info "Pre-restore Backup: $PRE_RESTORE_BACKUP"
    log_info "Restore Log: $RESTORE_LOG"
    log_info "==================================================================="

    send_notification "SUCCESS" "Database restore completed in ${DURATION}s"
}

# Run main function
main "$@"
