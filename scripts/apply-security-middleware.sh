#!/bin/bash

##############################################################################
# API Security Middleware Application Script
#
# This script helps apply security middleware to API routes in bulk
#
# Usage:
#   ./scripts/apply-security-middleware.sh [options]
#
# Options:
#   --dry-run         Show what would be changed without making changes
#   --route-type TYPE Apply to specific route type (auth|protected|admin|public)
#   --help            Show this help message
#
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
ROUTE_TYPE=""
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$BASE_DIR/src/app/api"

# Statistics
TOTAL_FILES=0
MODIFIED_FILES=0
SKIPPED_FILES=0
ERROR_FILES=0

##############################################################################
# Functions
##############################################################################

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}API Security Middleware Application${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --dry-run         Show what would be changed without making changes"
    echo "  --route-type TYPE Apply to specific route type (auth|protected|admin|public)"
    echo "  --help            Show this help message"
    echo ""
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

get_route_type() {
    local file="$1"

    # Determine route type based on path
    if [[ "$file" == *"/auth/"* ]]; then
        echo "auth"
    elif [[ "$file" == *"/admin/"* ]] || [[ "$file" == *"/rbac/"* ]]; then
        echo "admin"
    elif [[ "$file" == *"/health"* ]] || [[ "$file" == *"/status"* ]] || [[ "$file" == *"/metrics"* ]]; then
        echo "public"
    elif [[ "$file" == *"/webhook"* ]]; then
        echo "webhook"
    else
        echo "protected"
    fi
}

get_security_wrapper() {
    local route_type="$1"

    case "$route_type" in
        "auth")
            echo "withAuthSecurity"
            ;;
        "admin")
            echo "withAdminSecurity"
            ;;
        "public")
            echo "withPublicSecurity"
            ;;
        "webhook")
            echo "withWebhookSecurity"
            ;;
        "protected")
            echo "withProtectedSecurity"
            ;;
        *)
            echo "withProtectedSecurity"
            ;;
    esac
}

check_if_secured() {
    local file="$1"

    # Check if file already has security wrapper
    if grep -q "withPublicSecurity\|withAuthSecurity\|withProtectedSecurity\|withAdminSecurity\|withWebhookSecurity" "$file"; then
        return 0
    else
        return 1
    fi
}

apply_security() {
    local file="$1"
    local route_type="$2"
    local security_wrapper=$(get_security_wrapper "$route_type")

    log_info "Processing: $file (type: $route_type, wrapper: $security_wrapper)"

    # Check if already secured
    if check_if_secured "$file"; then
        log_warning "Already secured, skipping: $file"
        ((SKIPPED_FILES++))
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY-RUN] Would apply $security_wrapper to: $file"
        ((MODIFIED_FILES++))
    else
        # This is a placeholder - actual modification would be more complex
        # and would require proper parsing of TypeScript/JavaScript
        log_warning "Automatic modification not implemented - please apply manually"
        log_info "  Import: import { $security_wrapper } from '@/lib/security/apiSecurityWrapper';"
        log_info "  Wrap: export const METHOD = $security_wrapper(handler);"
        ((SKIPPED_FILES++))
    fi
}

process_file() {
    local file="$1"
    ((TOTAL_FILES++))

    # Determine route type
    local route_type=$(get_route_type "$file")

    # Skip if filtering by route type and this doesn't match
    if [ -n "$ROUTE_TYPE" ] && [ "$route_type" != "$ROUTE_TYPE" ]; then
        return
    fi

    # Apply security
    apply_security "$file" "$route_type"
}

##############################################################################
# Main Script
##############################################################################

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --route-type)
            ROUTE_TYPE="$2"
            shift 2
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Print header
print_header

# Configuration summary
if [ "$DRY_RUN" = true ]; then
    log_warning "DRY-RUN MODE: No files will be modified"
fi

if [ -n "$ROUTE_TYPE" ]; then
    log_info "Filtering by route type: $ROUTE_TYPE"
fi

echo ""

# Find all route files
log_info "Searching for route files in: $API_DIR"
echo ""

# Process each route file
find "$API_DIR" -name "route.ts" -type f | sort | while read -r file; do
    process_file "$file"
done

# Print statistics
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Total files found:     $TOTAL_FILES"
echo "Files modified:        $MODIFIED_FILES"
echo "Files skipped:         $SKIPPED_FILES"
echo "Files with errors:     $ERROR_FILES"
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warning "This was a dry-run. No files were actually modified."
    log_info "Run without --dry-run to apply changes."
else
    log_info "Manual application required. Follow the implementation guide."
fi

exit 0
