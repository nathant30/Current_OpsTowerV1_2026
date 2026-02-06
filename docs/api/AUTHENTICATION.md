# OpsTower API Authentication Guide

## Overview

OpsTower API uses **JWT (JSON Web Tokens)** for authentication with support for **Multi-Factor Authentication (MFA)** for enhanced security.

## Authentication Flow

```
┌─────────┐                                     ┌─────────┐
│ Client  │                                     │   API   │
└────┬────┘                                     └────┬────┘
     │                                               │
     │  POST /api/auth/login                         │
     │  { email, password }                          │
     ├──────────────────────────────────────────────>│
     │                                               │
     │                                               │ Verify credentials
     │                                               │ Check if MFA enabled
     │                                               │
     │  { token, user, mfaRequired }                 │
     │<──────────────────────────────────────────────┤
     │                                               │
     │  [If MFA required]                            │
     │  POST /api/auth/mfa/verify                    │
     │  { code, sessionId }                          │
     ├──────────────────────────────────────────────>│
     │                                               │
     │  { token, refreshToken }                      │
     │<──────────────────────────────────────────────┤
     │                                               │
     │  Subsequent requests:                         │
     │  Authorization: Bearer <token>                │
     ├──────────────────────────────────────────────>│
     │                                               │
     │  Protected resource                           │
     │<──────────────────────────────────────────────┤
     │                                               │
```

## Step 1: User Login

### Endpoint

```
POST /api/auth/login
```

### Request

```json
{
  "email": "driver@example.com",
  "password": "SecureP@ssw0rd"
}
```

### Response (MFA not enabled)

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_1234567890",
      "email": "driver@example.com",
      "name": "Juan dela Cruz",
      "role": "driver",
      "mfaEnabled": false
    },
    "mfaRequired": false
  }
}
```

### Response (MFA enabled)

```json
{
  "success": true,
  "data": {
    "mfaRequired": true,
    "sessionId": "sess_xyz123",
    "user": {
      "id": "usr_1234567890",
      "email": "driver@example.com",
      "name": "Juan dela Cruz"
    }
  }
}
```

## Step 2: MFA Verification (if required)

### Endpoint

```
POST /api/auth/mfa/verify
```

### Request

```json
{
  "sessionId": "sess_xyz123",
  "code": "123456"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_1234567890",
      "email": "driver@example.com",
      "name": "Juan dela Cruz",
      "role": "driver"
    }
  }
}
```

## Step 3: Using the Token

Include the JWT token in the `Authorization` header for all subsequent requests:

```http
GET /api/bookings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Token Refresh

Access tokens expire after **1 hour**. Use the refresh token to get a new access token without requiring login.

### Endpoint

```
POST /api/auth/refresh
```

### Request

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## MFA Setup

### Step 1: Initiate MFA Setup

```
POST /api/auth/mfa/setup
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    "backupCodes": [
      "12345678",
      "87654321",
      "11223344",
      "44332211",
      "55667788"
    ]
  }
}
```

**Instructions:**
1. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
2. Save backup codes in a secure location
3. Verify MFA setup with a code from your authenticator

### Step 2: Enable MFA

```
POST /api/auth/mfa/enable
Authorization: Bearer <token>
```

**Request:**

```json
{
  "code": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "MFA has been enabled for your account"
}
```

## MFA Recovery

If you lose access to your authenticator app, use a backup code:

```
POST /api/auth/mfa/recovery
```

**Request:**

```json
{
  "sessionId": "sess_xyz123",
  "backupCode": "12345678"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "...",
    "message": "Backup code used. Please set up MFA again."
  }
}
```

## Token Structure

JWT tokens contain the following claims:

```json
{
  "sub": "usr_1234567890",
  "email": "driver@example.com",
  "role": "driver",
  "permissions": ["bookings:read", "bookings:create"],
  "iat": 1707307200,
  "exp": 1707310800
}
```

## Security Best Practices

### For Clients

1. **Store tokens securely**
   - Web: `httpOnly` cookies or secure localStorage
   - Mobile: Keychain (iOS) or KeyStore (Android)

2. **Never share tokens**
   - Don't log tokens
   - Don't send in URL parameters
   - Don't commit to version control

3. **Handle token expiration**
   - Implement automatic refresh
   - Gracefully handle 401 responses
   - Redirect to login when refresh fails

4. **Use HTTPS only**
   - Never send tokens over HTTP
   - Validate SSL certificates

### For APIs

1. **Token validation**
   - Verify signature
   - Check expiration
   - Validate permissions

2. **Rate limiting**
   - Limit login attempts (5 per 15 minutes)
   - Limit MFA verification (3 attempts per session)

3. **Token revocation**
   - Implement token blacklist
   - Force logout on password change
   - Expire old tokens on MFA enable/disable

## Role-Based Access Control (RBAC)

Users are assigned roles that determine their permissions:

| Role | Level | Permissions |
|------|-------|-------------|
| **passenger** | 10 | View own bookings, create bookings, view payments |
| **driver** | 20 | View assigned rides, update ride status, view earnings |
| **operator** | 30 | Manage fleet, view analytics, manage drivers |
| **admin** | 40 | Full access except super_admin functions |
| **super_admin** | 50 | Complete system access |

## Code Examples

### JavaScript (Browser)

```javascript
// Login
async function login(email, password) {
  const response = await fetch('https://api.opstower.com/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.success) {
    if (data.data.mfaRequired) {
      // Handle MFA
      const code = prompt('Enter MFA code:');
      return verifyMFA(data.data.sessionId, code);
    } else {
      // Store token
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return data.data;
    }
  }

  throw new Error(data.error.message);
}

// Make authenticated request
async function makeAuthenticatedRequest(url) {
  const token = localStorage.getItem('token');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Token expired, try to refresh
    await refreshToken();
    return makeAuthenticatedRequest(url); // Retry
  }

  return response.json();
}

// Refresh token
async function refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('https://api.opstower.com/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('refreshToken', data.data.refreshToken);
  } else {
    // Refresh failed, redirect to login
    window.location.href = '/login';
  }
}
```

### Python

```python
import requests
import json

class OpsTowerClient:
    def __init__(self, base_url='https://api.opstower.com'):
        self.base_url = base_url
        self.token = None
        self.refresh_token = None

    def login(self, email, password):
        response = requests.post(
            f'{self.base_url}/api/auth/login',
            json={'email': email, 'password': password}
        )

        data = response.json()

        if data['success']:
            if data['data'].get('mfaRequired'):
                session_id = data['data']['sessionId']
                code = input('Enter MFA code: ')
                return self.verify_mfa(session_id, code)
            else:
                self.token = data['data']['token']
                self.refresh_token = data['data']['refreshToken']
                return data['data']

        raise Exception(data['error']['message'])

    def verify_mfa(self, session_id, code):
        response = requests.post(
            f'{self.base_url}/api/auth/mfa/verify',
            json={'sessionId': session_id, 'code': code}
        )

        data = response.json()

        if data['success']:
            self.token = data['data']['token']
            self.refresh_token = data['data']['refreshToken']
            return data['data']

        raise Exception(data['error']['message'])

    def get(self, endpoint):
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.get(f'{self.base_url}{endpoint}', headers=headers)

        if response.status_code == 401:
            # Token expired, refresh
            self._refresh_token()
            return self.get(endpoint)  # Retry

        return response.json()

    def _refresh_token(self):
        response = requests.post(
            f'{self.base_url}/api/auth/refresh',
            json={'refreshToken': self.refresh_token}
        )

        data = response.json()

        if data['success']:
            self.token = data['data']['token']
            self.refresh_token = data['data']['refreshToken']
        else:
            raise Exception('Token refresh failed')

# Usage
client = OpsTowerClient()
client.login('driver@example.com', 'SecureP@ssw0rd')
bookings = client.get('/api/bookings')
print(bookings)
```

### cURL

```bash
# Login
curl -X POST https://api.opstower.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com",
    "password": "SecureP@ssw0rd"
  }'

# Save token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Make authenticated request
curl -X GET https://api.opstower.com/api/bookings \
  -H "Authorization: Bearer $TOKEN"

# Refresh token
curl -X POST https://api.opstower.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## Error Handling

### Common Authentication Errors

| Status Code | Error Code | Description | Solution |
|-------------|-----------|-------------|----------|
| 401 | `UNAUTHORIZED` | Missing or invalid token | Login again |
| 401 | `TOKEN_EXPIRED` | Token has expired | Use refresh token |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password | Check credentials |
| 401 | `MFA_REQUIRED` | MFA verification needed | Verify MFA code |
| 401 | `INVALID_MFA_CODE` | Wrong MFA code | Try again (3 attempts max) |
| 403 | `FORBIDDEN` | Insufficient permissions | Check user role |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many attempts | Wait 15 minutes |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": {
      "expiredAt": "2026-02-07T12:00:00Z"
    }
  }
}
```

## Testing Authentication

Use the interactive API documentation at `/api-docs` to test authentication flows with real API calls.

## Support

For authentication issues:
- **Documentation**: https://docs.opstower.com
- **Email**: api@opstower.com
- **Emergency**: security@opstower.com

## Related Documents

- [OpenAPI Specification](./openapi.yaml)
- [Error Codes Reference](./ERROR_CODES.md)
- [RBAC Guide](../../SYSTEM_ARCHITECTURE.md#rbac)
