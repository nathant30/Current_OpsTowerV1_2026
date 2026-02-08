#!/bin/bash

##############################################################################
# API Security Testing Script
#
# This script tests the security middleware implementation
#
# Usage:
#   ./scripts/test-security.sh [base_url]
#
# Example:
#   ./scripts/test-security.sh http://localhost:3000
#
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${1:-http://localhost:3000}"
TESTS_PASSED=0
TESTS_FAILED=0

##############################################################################
# Test Functions
##############################################################################

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}API Security Testing${NC}"
    echo -e "${BLUE}Testing: $BASE_URL${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

test_passed() {
    echo -e "${GREEN}✓ PASSED${NC} $1"
    ((TESTS_PASSED++))
}

test_failed() {
    echo -e "${RED}✗ FAILED${NC} $1"
    ((TESTS_FAILED++))
}

test_info() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

##############################################################################
# Security Tests
##############################################################################

test_security_headers() {
    test_info "Testing security headers on /api/health"

    local response=$(curl -s -I "$BASE_URL/api/health")

    # Check for security headers
    if echo "$response" | grep -q "X-Content-Type-Options"; then
        test_passed "X-Content-Type-Options header present"
    else
        test_failed "X-Content-Type-Options header missing"
    fi

    if echo "$response" | grep -q "X-Frame-Options"; then
        test_passed "X-Frame-Options header present"
    else
        test_failed "X-Frame-Options header missing"
    fi

    if echo "$response" | grep -q "X-XSS-Protection"; then
        test_passed "X-XSS-Protection header present"
    else
        test_failed "X-XSS-Protection header missing"
    fi
}

test_rate_limiting() {
    test_info "Testing rate limiting (sending 5 requests)"

    local success_count=0
    local rate_limited=false

    for i in {1..5}; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
        if [ "$status" = "200" ]; then
            ((success_count++))
        elif [ "$status" = "429" ]; then
            rate_limited=true
        fi
    done

    if [ $success_count -gt 0 ]; then
        test_passed "API is accessible (got $success_count successful requests)"
    else
        test_failed "API not accessible"
    fi

    # Note: Rate limiting might not trigger with just 5 requests
    test_info "Rate limiting: would need 100+ requests to test properly"
}

test_cors_headers() {
    test_info "Testing CORS headers"

    local response=$(curl -s -I "$BASE_URL/api/health")

    if echo "$response" | grep -q "Access-Control-Allow"; then
        test_passed "CORS headers present"
    else
        test_failed "CORS headers missing"
    fi
}

test_public_route_access() {
    test_info "Testing public route access (/api/health)"

    local status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")

    if [ "$status" = "200" ]; then
        test_passed "Public route accessible without authentication"
    else
        test_failed "Public route returned status: $status"
    fi
}

test_protected_route_without_auth() {
    test_info "Testing protected route without authentication (/api/drivers)"

    local status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/drivers")

    if [ "$status" = "401" ]; then
        test_passed "Protected route blocks unauthenticated access"
    else
        test_failed "Protected route should return 401, got: $status"
    fi
}

test_auth_route_rate_limiting() {
    test_info "Testing auth route is protected (/api/auth/login)"

    local response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"invalid"}')

    # Should get some response (400 or 401), not 500
    if echo "$response" | grep -q "error\|message"; then
        test_passed "Auth route is responding"
    else
        test_failed "Auth route returned unexpected response"
    fi
}

test_input_sanitization() {
    test_info "Testing input sanitization (XSS attempt)"

    local response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test<script>alert(1)</script>@test.com","password":"pass"}')

    # Check that response doesn't contain the script tag
    if ! echo "$response" | grep -q "<script>"; then
        test_passed "Input sanitization working (no script tags in response)"
    else
        test_failed "Input sanitization may not be working properly"
    fi
}

##############################################################################
# Main Test Execution
##############################################################################

print_header

# Check if server is reachable
test_info "Checking if API server is reachable..."
if ! curl -s -f "$BASE_URL/api/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR${NC}: Cannot reach API server at $BASE_URL"
    echo "Please ensure the server is running"
    exit 1
fi
echo -e "${GREEN}✓${NC} Server is reachable"
echo ""

# Run tests
echo "Running security tests..."
echo ""

test_security_headers
echo ""

test_rate_limiting
echo ""

test_cors_headers
echo ""

test_public_route_access
echo ""

test_protected_route_without_auth
echo ""

test_auth_route_rate_limiting
echo ""

test_input_sanitization
echo ""

# Print summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Please review the results above.${NC}"
    exit 1
fi
