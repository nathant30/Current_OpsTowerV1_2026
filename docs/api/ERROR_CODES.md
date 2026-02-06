# OpsTower API Error Codes Reference

## Error Response Format

All errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "additional context"
    }
  }
}
```

## HTTP Status Codes

| Status Code | Meaning | When Used |
|-------------|---------|-----------|
| **400** | Bad Request | Invalid input, validation errors |
| **401** | Unauthorized | Missing or invalid authentication |
| **403** | Forbidden | Valid auth but insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource already exists or state conflict |
| **422** | Unprocessable Entity | Valid format but semantic errors |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error |
| **502** | Bad Gateway | Upstream service failure |
| **503** | Service Unavailable | Service temporarily down |

---

## Authentication Errors (401)

### UNAUTHORIZED
**Message**: "Authentication required"

**Cause**: No Authorization header provided

**Solution**: Include valid JWT token in Authorization header

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

### INVALID_TOKEN
**Message**: "Invalid authentication token"

**Cause**: Malformed or tampered JWT token

**Solution**: Login again to get a new token

---

### TOKEN_EXPIRED
**Message**: "Authentication token has expired"

**Cause**: JWT token past expiration time (1 hour default)

**Solution**: Use refresh token to get new access token

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Authentication token has expired",
    "details": {
      "expiredAt": "2026-02-07T12:00:00Z"
    }
  }
}
```

---

### INVALID_CREDENTIALS
**Message**: "Invalid email or password"

**Cause**: Wrong login credentials

**Solution**: Check email and password, use password reset if needed

---

### ACCOUNT_LOCKED
**Message**: "Account has been locked due to too many failed login attempts"

**Cause**: Exceeded max failed login attempts (5 attempts)

**Solution**: Wait 15 minutes or contact support

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account has been locked due to too many failed login attempts",
    "details": {
      "unlockAt": "2026-02-07T12:15:00Z"
    }
  }
}
```

---

### MFA_REQUIRED
**Message**: "Multi-factor authentication required"

**Cause**: User has MFA enabled, need to verify code

**Solution**: Complete MFA verification flow

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "MFA_REQUIRED",
    "message": "Multi-factor authentication required",
    "details": {
      "sessionId": "sess_xyz123"
    }
  }
}
```

---

### INVALID_MFA_CODE
**Message**: "Invalid MFA verification code"

**Cause**: Wrong or expired TOTP code

**Solution**: Try again with current code (3 attempts max)

---

### SESSION_EXPIRED
**Message**: "Session has expired"

**Cause**: Session timeout (30 minutes idle)

**Solution**: Login again

---

## Authorization Errors (403)

### FORBIDDEN
**Message**: "You do not have permission to access this resource"

**Cause**: Valid authentication but insufficient role/permissions

**Solution**: Contact admin to request access

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource",
    "details": {
      "required": "admin",
      "current": "driver"
    }
  }
}
```

---

### INSUFFICIENT_PERMISSIONS
**Message**: "Insufficient permissions for this operation"

**Cause**: User role lacks required permission

**Solution**: Request role upgrade or contact admin

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions for this operation",
    "details": {
      "required": ["bookings:delete"],
      "has": ["bookings:read", "bookings:create"]
    }
  }
}
```

---

### REGION_RESTRICTED
**Message**: "Access restricted to specific regions"

**Cause**: User not authorized for requested region

**Solution**: Contact admin for region access

---

## Validation Errors (400)

### VALIDATION_ERROR
**Message**: "Validation failed"

**Cause**: Request body failed validation

**Solution**: Fix validation errors and resubmit

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format"
        },
        {
          "field": "amount",
          "message": "Amount must be greater than 0"
        }
      ]
    }
  }
}
```

---

### MISSING_REQUIRED_FIELD
**Message**: "Required field is missing"

**Cause**: Missing required parameter

**Solution**: Include all required fields

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "MISSING_REQUIRED_FIELD",
    "message": "Required field is missing",
    "details": {
      "field": "customerEmail",
      "required": true
    }
  }
}
```

---

### INVALID_FORMAT
**Message**: "Invalid data format"

**Cause**: Data doesn't match expected format

**Solution**: Check API documentation for correct format

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FORMAT",
    "message": "Invalid data format",
    "details": {
      "field": "phone",
      "expected": "+63XXXXXXXXXX",
      "received": "09171234567"
    }
  }
}
```

---

## Resource Errors (404, 409)

### NOT_FOUND
**Message**: "Resource not found"

**Cause**: Requested resource doesn't exist

**Solution**: Verify resource ID

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": {
      "resource": "booking",
      "id": "bkg_nonexistent"
    }
  }
}
```

---

### ALREADY_EXISTS
**Message**: "Resource already exists"

**Cause**: Attempted to create duplicate resource

**Solution**: Use existing resource or update instead

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_EXISTS",
    "message": "Resource already exists",
    "details": {
      "resource": "user",
      "field": "email",
      "value": "driver@example.com"
    }
  }
}
```

---

### CONFLICT
**Message**: "Resource state conflict"

**Cause**: Operation conflicts with current resource state

**Solution**: Refresh resource and retry

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Cannot cancel completed booking",
    "details": {
      "currentStatus": "completed",
      "attemptedAction": "cancel"
    }
  }
}
```

---

## Payment Errors

### PAYMENT_FAILED
**Message**: "Payment processing failed"

**Cause**: Payment gateway rejected transaction

**Solution**: Check payment details and try again

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Payment processing failed",
    "details": {
      "provider": "maya",
      "reason": "insufficient_funds",
      "transactionId": "txn_12345"
    }
  }
}
```

---

### PAYMENT_TIMEOUT
**Message**: "Payment request timed out"

**Cause**: No response from payment gateway within timeout period

**Solution**: Check payment status or retry

---

### INSUFFICIENT_FUNDS
**Message**: "Insufficient funds"

**Cause**: User account has insufficient balance

**Solution**: Add funds and retry payment

---

### INVALID_AMOUNT
**Message**: "Invalid payment amount"

**Cause**: Amount below minimum or above maximum

**Solution**: Check amount limits

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Invalid payment amount",
    "details": {
      "amount": 0.50,
      "minimum": 1.00,
      "maximum": 50000.00,
      "currency": "PHP"
    }
  }
}
```

---

### REFUND_FAILED
**Message**: "Refund processing failed"

**Cause**: Refund cannot be processed

**Solution**: Contact support

---

### PAYMENT_METHOD_UNAVAILABLE
**Message**: "Payment method is currently unavailable"

**Cause**: Payment gateway maintenance or downtime

**Solution**: Try alternative payment method

---

## Rate Limiting (429)

### RATE_LIMIT_EXCEEDED
**Message**: "Rate limit exceeded"

**Cause**: Too many requests in time window

**Solution**: Wait before retrying

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "window": "1 hour",
      "retryAfter": 1800,
      "resetAt": "2026-02-07T13:00:00Z"
    }
  }
}
```

**Response Headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707307200
Retry-After: 1800
```

---

### TOO_MANY_LOGIN_ATTEMPTS
**Message**: "Too many login attempts"

**Cause**: Exceeded login rate limit

**Solution**: Wait 15 minutes

---

## Server Errors (500+)

### INTERNAL_SERVER_ERROR
**Message**: "An unexpected error occurred"

**Cause**: Unhandled server error

**Solution**: Contact support with error ID

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "details": {
      "errorId": "err_xyz123",
      "timestamp": "2026-02-07T12:00:00Z"
    }
  }
}
```

---

### SERVICE_UNAVAILABLE
**Message**: "Service temporarily unavailable"

**Cause**: Planned maintenance or temporary outage

**Solution**: Check status page, retry later

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "details": {
      "estimatedRestoration": "2026-02-07T14:00:00Z",
      "statusPage": "https://status.opstower.com"
    }
  }
}
```

---

### DATABASE_ERROR
**Message**: "Database error occurred"

**Cause**: Database connection or query error

**Solution**: Retry request, contact support if persists

---

### UPSTREAM_SERVICE_ERROR
**Message**: "Upstream service error"

**Cause**: Third-party service failure (Maya, GCash, etc.)

**Solution**: Try again later or use alternative

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "UPSTREAM_SERVICE_ERROR",
    "message": "Payment provider is currently unavailable",
    "details": {
      "provider": "maya",
      "status": "maintenance"
    }
  }
}
```

---

## Compliance Errors

### COMPLIANCE_VALIDATION_FAILED
**Message**: "Compliance validation failed"

**Cause**: Data doesn't meet regulatory requirements

**Solution**: Fix compliance issues and resubmit

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "COMPLIANCE_VALIDATION_FAILED",
    "message": "BSP reporting data incomplete",
    "details": {
      "missingFields": ["customerAddress", "idNumber"]
    }
  }
}
```

---

### KYC_REQUIRED
**Message**: "KYC verification required"

**Cause**: Operation requires completed KYC

**Solution**: Complete KYC verification

---

### AML_THRESHOLD_EXCEEDED
**Message**: "AML threshold exceeded"

**Cause**: Transaction exceeds AML monitoring threshold

**Solution**: Additional verification required

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "AML_THRESHOLD_EXCEEDED",
    "message": "Transaction requires additional verification",
    "details": {
      "threshold": 50000,
      "amount": 75000,
      "currency": "PHP"
    }
  }
}
```

---

## Booking Errors

### BOOKING_NOT_AVAILABLE
**Message**: "Booking slot not available"

**Cause**: No drivers available or time slot taken

**Solution**: Try different time or location

---

### DRIVER_NOT_AVAILABLE
**Message**: "No drivers available"

**Cause**: No drivers in service area

**Solution**: Wait and retry or change location

---

### INVALID_BOOKING_STATUS
**Message**: "Invalid booking status transition"

**Cause**: Cannot change booking to requested status

**Solution**: Check valid status transitions

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_BOOKING_STATUS",
    "message": "Cannot cancel completed booking",
    "details": {
      "currentStatus": "completed",
      "requestedStatus": "cancelled",
      "allowedTransitions": ["pending"]
    }
  }
}
```

---

## Error Code Quick Reference

| Code | Status | Category | Severity |
|------|--------|----------|----------|
| UNAUTHORIZED | 401 | Auth | High |
| INVALID_TOKEN | 401 | Auth | High |
| TOKEN_EXPIRED | 401 | Auth | Medium |
| INVALID_CREDENTIALS | 401 | Auth | Medium |
| ACCOUNT_LOCKED | 401 | Auth | High |
| MFA_REQUIRED | 401 | Auth | Medium |
| INVALID_MFA_CODE | 401 | Auth | Medium |
| FORBIDDEN | 403 | Auth | High |
| INSUFFICIENT_PERMISSIONS | 403 | Auth | Medium |
| VALIDATION_ERROR | 400 | Validation | Low |
| MISSING_REQUIRED_FIELD | 400 | Validation | Low |
| INVALID_FORMAT | 400 | Validation | Low |
| NOT_FOUND | 404 | Resource | Low |
| ALREADY_EXISTS | 409 | Resource | Low |
| CONFLICT | 409 | Resource | Medium |
| PAYMENT_FAILED | 422 | Payment | High |
| INSUFFICIENT_FUNDS | 422 | Payment | Medium |
| INVALID_AMOUNT | 400 | Payment | Low |
| RATE_LIMIT_EXCEEDED | 429 | Rate Limit | Medium |
| INTERNAL_SERVER_ERROR | 500 | Server | Critical |
| SERVICE_UNAVAILABLE | 503 | Server | High |
| DATABASE_ERROR | 500 | Server | Critical |
| UPSTREAM_SERVICE_ERROR | 502 | Server | High |

---

## Handling Errors in Code

### JavaScript Example

```javascript
async function handleApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!data.success) {
      // Handle specific error codes
      switch (data.error.code) {
        case 'TOKEN_EXPIRED':
          await refreshToken();
          return handleApiCall(url, options); // Retry

        case 'RATE_LIMIT_EXCEEDED':
          const retryAfter = data.error.details.retryAfter;
          await sleep(retryAfter * 1000);
          return handleApiCall(url, options); // Retry

        case 'PAYMENT_FAILED':
          showPaymentError(data.error.message);
          break;

        case 'VALIDATION_ERROR':
          showValidationErrors(data.error.details.errors);
          break;

        default:
          showGenericError(data.error.message);
      }

      throw new Error(data.error.message);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

### Python Example

```python
class OpsTowerAPIError(Exception):
    def __init__(self, code, message, details=None):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(self.message)

def handle_api_response(response):
    data = response.json()

    if not data.get('success'):
        error = data.get('error', {})
        code = error.get('code')
        message = error.get('message')
        details = error.get('details')

        # Handle specific errors
        if code == 'TOKEN_EXPIRED':
            refresh_token()
            return 'RETRY'
        elif code == 'RATE_LIMIT_EXCEEDED':
            retry_after = details.get('retryAfter', 60)
            time.sleep(retry_after)
            return 'RETRY'

        raise OpsTowerAPIError(code, message, details)

    return data
```

---

## Best Practices

1. **Always check success field** before processing response
2. **Handle specific error codes** for better UX
3. **Log error IDs** for support troubleshooting
4. **Respect rate limits** and implement backoff
5. **Show user-friendly messages** based on error codes
6. **Implement retry logic** for transient errors
7. **Never expose technical details** to end users

---

## Getting Help

- **API Documentation**: https://docs.opstower.com
- **Status Page**: https://status.opstower.com
- **Support Email**: support@opstower.com
- **Emergency**: security@opstower.com

## Related Documents

- [OpenAPI Specification](./openapi.yaml)
- [Authentication Guide](./AUTHENTICATION.md)
- [API Documentation](/api-docs)
