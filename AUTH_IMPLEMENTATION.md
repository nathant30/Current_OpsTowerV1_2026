# Authentication Implementation Guide
## Xpress Ops Tower - Phase 1B: JWT Authentication & MFA

**Version:** 1.0
**Last Updated:** 2026-02-08
**Status:** Production Ready

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [JWT Token Management](#jwt-token-management)
3. [Multi-Factor Authentication](#multi-factor-authentication)
4. [Session Management](#session-management)
5. [API Endpoints](#api-endpoints)
6. [Security Features](#security-features)
7. [Configuration](#configuration)
8. [Usage Examples](#usage-examples)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌──────────────────────────────────────────────────────────────┐
│                     Client Application                        │
│  - Login UI                                                   │
│  - MFA Challenge UI                                           │
│  - Session Timeout Warning                                    │
│  - Session Management Dashboard                               │
└────────────────┬─────────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                   API Layer (Next.js)                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Authentication Routes                                   │  │
│  │  - POST /api/auth/login                                 │  │
│  │  - POST /api/auth/refresh                               │  │
│  │  - POST /api/auth/logout                                │  │
│  │  - POST /api/auth/mfa/setup                             │  │
│  │  - POST /api/auth/mfa/challenge                         │  │
│  │  - POST /api/auth/mfa/verify                            │  │
│  │  - GET  /api/auth/session/list                          │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                   Service Layer                               │
│  ┌───────────────┐ ┌──────────────┐ ┌───────────────────┐   │
│  │ AuthManager   │ │ TokenManager │ │ MFAIntegration    │   │
│  │ (auth.ts)     │ │ (token-      │ │ (mfa-             │   │
│  │               │ │  manager.ts) │ │  integration.ts)  │   │
│  └───────────────┘ └──────────────┘ └───────────────────┘   │
│  ┌───────────────┐ ┌──────────────┐ ┌───────────────────┐   │
│  │ MFAService    │ │ Session      │ │ MFADatabase       │   │
│  │ (mfa-         │ │ Security     │ │ Service           │   │
│  │  service.ts)  │ │ (session-    │ │ (mfa-database-    │   │
│  │               │ │  security.ts)│ │  service.ts)      │   │
│  └───────────────┘ └──────────────┘ └───────────────────┘   │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                   Data Layer                                  │
│  ┌───────────────┐ ┌──────────────┐ ┌───────────────────┐   │
│  │ Redis         │ │ PostgreSQL   │ │ SQLite            │   │
│  │ - Sessions    │ │ - MFA Config │ │ - User Data       │   │
│  │ - Token       │ │ - Challenges │ │ - Mock Data       │   │
│  │   Blacklist   │ │ - Audit Logs │ │                   │   │
│  │ - Rate Limits │ │              │ │                   │   │
│  └───────────────┘ └──────────────┘ └───────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Security First:** All tokens expire, rotate, and can be revoked
2. **Defense in Depth:** Multiple layers of security (JWT + MFA + Sessions)
3. **Fail Secure:** Errors default to denying access
4. **Audit Everything:** All authentication events are logged
5. **Zero Trust:** Every request is validated independently

---

## JWT Token Management

### Token Architecture

The system uses a dual-token approach:
- **Access Tokens:** Short-lived (15 minutes), used for API requests
- **Refresh Tokens:** Long-lived (7 days), used to obtain new access tokens

### Token Structure

**Access Token Payload:**
```typescript
{
  userId: string;
  userType: 'operator' | 'driver' | 'system';
  role: string;
  regionId?: string;
  permissions: string[];
  sessionId: string;
  deviceId?: string;
  tokenId: string;        // Unique ID for blacklisting
  fingerprint: string;    // Security fingerprint
  iat: number;            // Issued at
  exp: number;            // Expires at
  iss: 'xpress-ops-tower';
  aud: 'xpress-operations';
}
```

**Refresh Token Payload:**
```typescript
{
  userId: string;
  sessionId: string;
  tokenId: string;
  type: 'refresh';
  fingerprint: string;
  iat: number;
  exp: number;
  iss: 'xpress-ops-tower';
  aud: 'xpress-operations';
}
```

### Token Rotation

**Automatic Rotation** (Enabled by default):
- Each refresh generates a NEW refresh token
- Old refresh token is blacklisted immediately
- 30-second grace period for race conditions
- Detects and blocks token reuse attacks

**Token Lifecycle:**
```
Login
  ↓
Generate Token Pair (Access + Refresh)
  ↓
Access Token Expires (15 min)
  ↓
Client Requests Refresh
  ↓
Validate Refresh Token
  ↓
Generate NEW Token Pair
  ↓
Blacklist OLD Refresh Token
  ↓
Return NEW Tokens
```

### Token Blacklisting

**Purpose:** Immediate token revocation for logout and security incidents

**Storage:**
- In-Memory Map (development)
- Redis (production, recommended)
- Automatic cleanup of expired entries every 5 minutes

**Operations:**
```typescript
// Blacklist a single token
await tokenManager.blacklistToken(tokenId, userId, expiresAt);

// Revoke all tokens for a user
await tokenManager.revokeAllUserTokens(userId);

// Revoke token family (for security incidents)
await tokenManager.revokeTokenFamily(tokenId);
```

### Token Fingerprinting

**Security Feature:** Binds tokens to user/session context

**Generation:**
```typescript
fingerprint = SHA256(userId + sessionId + secret).substring(0, 16)
```

**Validation:** Every token verification checks fingerprint match

---

## Multi-Factor Authentication

### Supported Methods

1. **TOTP (Time-based One-Time Password)**
   - Google Authenticator, Authy, 1Password
   - 6-digit codes, 30-second window
   - 2-step tolerance (±60 seconds)

2. **SMS**
   - 6-digit numeric codes
   - 5-minute expiry
   - Twilio integration (production)

3. **Email**
   - 6-digit numeric codes
   - 5-minute expiry
   - SendGrid integration (production)

4. **Backup Codes**
   - 8-character alphanumeric codes
   - One-time use
   - 10 codes generated per user

### MFA Enrollment Flow

```
1. User Requests MFA Setup
   POST /api/auth/mfa/setup { method: 'totp' }

2. System Generates Secret/QR Code
   { secret, qrCodeUrl, backupCodes }

3. User Scans QR Code (TOTP) or Confirms Phone/Email

4. User Enters Verification Code
   POST /api/auth/mfa/verify { challengeId, code }

5. System Enables MFA
   Settings stored in database
   Backup codes generated
```

### MFA Login Flow

```
1. User Submits Credentials
   POST /api/auth/login { email, password }

2. System Validates Credentials
   ✓ User exists
   ✓ Password correct
   ✓ Account active

3. System Checks MFA Status
   if (mfaEnabled) {
     return { requiresMfa: true, challengeId }
   }

4. Client Prompts for MFA Code
   UI displays MFA challenge form

5. User Enters MFA Code
   POST /api/auth/mfa/verify { challengeId, code }

6. System Verifies Code
   ✓ Challenge valid
   ✓ Code matches
   ✓ Not expired
   ✓ Attempts remaining

7. Return Tokens
   { accessToken, refreshToken, expiresIn }
```

### MFA Challenge System

**Challenge Structure:**
```typescript
interface MFAChallenge {
  challengeId: string;
  userId: string;
  method: 'sms' | 'email' | 'totp' | 'backup_code';
  codeHash: string;        // Hashed for security
  createdAt: Date;
  expiresAt: Date;         // 5-minute default
  attempts: number;
  maxAttempts: number;     // 3-5 depending on sensitivity
  status: 'pending' | 'verified' | 'expired' | 'locked';
}
```

**Security Features:**
- Codes are hashed before storage
- Attempt limits prevent brute force
- Challenges expire after 5 minutes
- Timing-safe comparison prevents timing attacks

### MFA Database Schema (PostgreSQL)

```sql
-- MFA Settings
CREATE TABLE user_mfa_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_enforced BOOLEAN DEFAULT FALSE,

  -- TOTP
  totp_enabled BOOLEAN DEFAULT FALSE,
  totp_secret TEXT,  -- Encrypted
  totp_verified_at TIMESTAMP,

  -- SMS
  sms_enabled BOOLEAN DEFAULT FALSE,
  sms_phone TEXT,  -- Encrypted
  sms_verified_at TIMESTAMP,

  -- Email
  email_enabled BOOLEAN DEFAULT FALSE,
  email_address TEXT,  -- Encrypted
  email_verified_at TIMESTAMP,

  -- Preferences
  preferred_method VARCHAR(20) DEFAULT 'totp',

  -- Backup Codes
  backup_codes_remaining INTEGER DEFAULT 0,
  backup_codes_generated_at TIMESTAMP,

  -- Recovery
  recovery_email TEXT,  -- Encrypted
  recovery_phone TEXT,  -- Encrypted

  -- Trusted Devices
  trusted_devices JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- MFA Challenges
CREATE TABLE mfa_challenges (
  id SERIAL PRIMARY KEY,
  challenge_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  method VARCHAR(20) NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  locked_at TIMESTAMP,
  action VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending'
);

-- Backup Codes
CREATE TABLE mfa_backup_codes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  code_hash TEXT NOT NULL,
  code_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  used_ip VARCHAR(45),
  used_user_agent TEXT,
  expires_at TIMESTAMP
);

-- Audit Log
CREATE TABLE mfa_enrollment_audit (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  method VARCHAR(20),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Session Management

### Session Architecture

**Session Storage:**
- In-memory Map (development)
- Redis (production, recommended)
- Persistent across server restarts (with Redis)

**Session Data:**
```typescript
interface SessionData {
  userId: string;
  userType: 'operator' | 'driver' | 'system';
  role: string;
  regionId?: string;
  permissions: string[];
  createdAt: number;
  lastActivity: number;
  deviceId?: string;
}
```

### Session Timeout

**Inactivity Timeout:** 30 minutes (configurable)
**Maximum Session Duration:** Role-dependent

| Role              | Idle Timeout | Max Duration |
|-------------------|--------------|--------------|
| support_agent     | 30 min       | 8 hours      |
| ops_manager       | 20 min       | 10 hours     |
| regional_manager  | 15 min       | 12 hours     |
| executive         | 10 min       | 8 hours      |
| risk_investigator | 10 min       | 6 hours      |

**Enforcement:**
- Checked on every token verification
- Session deleted when timeout exceeded
- Client receives 401 Unauthorized
- User must re-authenticate

### Concurrent Session Limits

**Limits by Role:**
- support_agent: 2 concurrent sessions
- ops_manager: 3 concurrent sessions
- regional_manager: 3 concurrent sessions
- executive: 5 concurrent sessions
- risk_investigator: 2 concurrent sessions

**Enforcement:**
- Checked at login
- Oldest session terminated when limit reached
- User notified of session termination

### Session Security Features

1. **Device Fingerprinting**
   ```typescript
   interface DeviceFingerprint {
     userAgent: string;
     screenResolution: string;
     timezone: string;
     language: string;
     platform: string;
     cookieEnabled: boolean;
     fingerprint: string;  // Hash of above
   }
   ```

2. **Risk Scoring**
   - New device: +2 risk
   - Unusual IP: +2 risk
   - Suspicious user agent: +1 risk
   - Risk score 0-10 (7+ triggers alerts)

3. **Security Alerts**
   - IP address changes
   - Device changes
   - Unusual activity patterns
   - Privilege escalation attempts

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and return JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "mfaCode": "123456",  // Optional, required if MFA enabled
  "remember": false
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "usr-12345",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ops_manager",
      "regionId": "reg-001",
      "mfaEnabled": true,
      "sessionId": "sess_1234567890_abcdef"
    },
    "permissions": ["drivers:read", "bookings:write", ...],
    "expiresIn": 900  // 15 minutes in seconds
  }
}
```

**Response (MFA Required):**
```json
{
  "success": false,
  "error": {
    "code": "MFA_REQUIRED",
    "message": "MFA code required",
    "data": {
      "requiresMfa": true,
      "challengeId": "mfa_1234567890_abc123",
      "method": "totp"
    }
  }
}
```

#### POST /api/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",  // New token (rotation enabled)
    "expiresIn": 900
  }
}
```

#### POST /api/auth/logout
Logout user and invalidate tokens.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### MFA Endpoints

#### POST /api/auth/mfa/setup
Setup MFA for authenticated user.

**Request:**
```json
{
  "method": "totp",
  "phoneNumber": "+1234567890",  // For SMS
  "email": "user@example.com"    // For email
}
```

**Response (TOTP):**
```json
{
  "success": true,
  "data": {
    "method": "totp",
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "otpauth://totp/XpressOpsTower:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=XpressOpsTower",
    "backupCodes": [
      "2K9QW3R4",
      "7P8LM6N5",
      ...
    ]
  }
}
```

#### POST /api/auth/mfa/challenge
Create MFA challenge (for login).

**Request:**
```json
{
  "userId": "usr-12345",
  "method": "totp",  // Optional, uses preferred method if not specified
  "action": "login"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "challengeId": "mfa_1234567890_abc123",
    "expiresAt": "2026-02-08T12:35:00Z",
    "method": "totp"
  }
}
```

#### POST /api/auth/mfa/verify
Verify MFA challenge.

**Request:**
```json
{
  "challengeId": "mfa_1234567890_abc123",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "challengeId": "mfa_1234567890_abc123"
  }
}
```

**Response (Failed):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "Invalid verification code",
    "data": {
      "remainingAttempts": 2
    }
  }
}
```

---

## Security Features

### 1. Password Security
- **Hashing:** bcrypt with 12 rounds
- **Minimum Requirements:** 8+ characters, mixed case, numbers, symbols
- **Password Reset:** Secure token-based reset flow

### 2. Rate Limiting
- **Login Attempts:** 5 per 15 minutes per IP
- **API Requests:** 100 per hour per user
- **MFA Attempts:** 3-5 per challenge

### 3. Audit Logging
All authentication events logged:
- Login attempts (success/failure)
- Token refreshes
- Logout events
- MFA enrollment
- MFA verification
- Session timeouts
- Security alerts

### 4. Token Security
- Short-lived access tokens (15 min)
- Refresh token rotation
- Token blacklisting
- Token fingerprinting
- Secure signing (HS256)

### 5. Session Security
- Inactivity timeout
- Concurrent session limits
- Device fingerprinting
- IP tracking
- Risk scoring

---

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_ACCESS_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFRESH_ROTATION=true

# MFA Configuration
MFA_SECRET_KEY=<32-char-encryption-key>

# Session Storage (Redis)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=<redis-password>
REDIS_TLS=false

# SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=<account-sid>
TWILIO_AUTH_TOKEN=<auth-token>
TWILIO_PHONE_NUMBER=<e.164-format-number>

# Email Provider (SendGrid)
SENDGRID_API_KEY=<api-key>
SENDGRID_FROM_EMAIL=noreply@xpressopstower.com
SENDGRID_FROM_NAME=Xpress Ops Tower

# Database (PostgreSQL for MFA)
DATABASE_URL=postgresql://user:pass@localhost:5432/opstower
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=opstower
DATABASE_USER=opstower_user
DATABASE_PASSWORD=<db-password>

# Database Encryption
DATABASE_ENCRYPTION_KEY=<32-char-encryption-key>

# Security
NODE_ENV=production
BYPASS_AUTH=false  # NEVER set to true in production
```

### Generating Secrets

```bash
# Generate JWT secrets
openssl rand -hex 64

# Generate MFA encryption key
openssl rand -hex 32

# Generate database encryption key
openssl rand -hex 32
```

---

## Usage Examples

### Client-Side Authentication

```typescript
// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  }),
});

const loginData = await loginResponse.json();

if (loginData.error?.code === 'MFA_REQUIRED') {
  // Show MFA challenge UI
  const mfaCode = await promptUserForMFACode();

  const mfaResponse = await fetch('/api/auth/mfa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId: loginData.error.data.challengeId,
      code: mfaCode,
    }),
  });

  if (mfaResponse.ok) {
    // MFA verified, retry login with token
    // Or use alternative flow depending on implementation
  }
}

// Store tokens securely
localStorage.setItem('accessToken', loginData.data.token);
localStorage.setItem('refreshToken', loginData.data.refreshToken);

// Make authenticated requests
const response = await fetch('/api/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  },
});

// Handle token expiration
if (response.status === 401) {
  // Refresh token
  const refreshResponse = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: localStorage.getItem('refreshToken'),
    }),
  });

  if (refreshResponse.ok) {
    const refreshData = await refreshResponse.json();
    localStorage.setItem('accessToken', refreshData.data.token);
    if (refreshData.data.refreshToken) {
      // Update refresh token if rotated
      localStorage.setItem('refreshToken', refreshData.data.refreshToken);
    }
    // Retry original request
  } else {
    // Redirect to login
    window.location.href = '/login';
  }
}

// Logout
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  },
});
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

### Server-Side Token Verification

```typescript
import { authManager } from '@/lib/auth';

// Verify token in API route
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await authManager.verifyToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Check permissions
  if (!authManager.hasPermission(user, 'bookings:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized request
  return NextResponse.json({ data: 'Protected data' });
}
```

### MFA Enrollment

```typescript
// Setup TOTP
const setupResponse = await fetch('/api/auth/mfa/setup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    method: 'totp',
  }),
});

const setupData = await setupResponse.json();

// Display QR code to user
displayQRCode(setupData.data.qrCodeUrl);

// Store backup codes securely
downloadBackupCodes(setupData.data.backupCodes);

// Verify TOTP is working
const verifyResponse = await fetch('/api/auth/mfa/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    challengeId: setupData.data.challengeId,
    code: '123456',  // From authenticator app
  }),
});
```

---

## Testing

### Test user MFA enrollment
```bash
# Setup test environment
cp .env.example .env
# Edit .env with test credentials

# Start development server
npm run dev

# Test MFA enrollment
curl -X POST http://localhost:4000/api/auth/mfa/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-token>" \
  -d '{"method":"totp"}'
```

### Integration Tests

Create integration tests for auth flows:
```typescript
// __tests__/auth/login.test.ts
describe('Authentication Flow', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('should require MFA when enabled', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mfa-user@example.com',
        password: 'TestPassword123!',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MFA_REQUIRED');
    expect(response.body.error.data.challengeId).toBeDefined();
  });

  it('should refresh tokens successfully', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    const refreshToken = loginResponse.body.data.refreshToken;

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.token).toBeDefined();
    expect(refreshResponse.body.data.refreshToken).toBeDefined();
    expect(refreshResponse.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('should blacklist tokens on logout', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    const token = loginResponse.body.data.token;

    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    const protectedResponse = await request(app)
      .get('/api/protected-endpoint')
      .set('Authorization', `Bearer ${token}`);

    expect(protectedResponse.status).toBe(401);
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Token Expired Immediately
**Symptom:** Access token expires right after login

**Solution:**
- Check system time is synchronized (NTP)
- Verify `JWT_ACCESS_EXPIRY` environment variable
- Check server and client timezone settings

#### 2. Refresh Token Rejected
**Symptom:** Refresh token returns 401 Unauthorized

**Causes:**
- Token rotation detected reuse (security feature)
- Refresh token expired (7 days default)
- Session deleted (logout or timeout)

**Solution:**
- Re-authenticate user
- Check refresh token expiry settings
- Review audit logs for security events

#### 3. MFA Challenge Not Received
**Symptom:** SMS/Email codes not delivered

**Solution:**
- Verify Twilio/SendGrid credentials
- Check phone number format (E.164)
- Review email spam/junk folder
- Check service provider logs

#### 4. Session Timeout Too Aggressive
**Symptom:** Users logged out frequently

**Solution:**
- Adjust inactivity timeout in session-security.ts
- Review role-based timeout settings
- Check for client-side bugs preventing activity updates

#### 5. TOTP Codes Not Working
**Symptom:** Authenticator codes rejected

**Causes:**
- Time drift between server and device
- Wrong secret entered
- Codes already used

**Solution:**
- Sync device time (automatic time zone)
- Regenerate TOTP secret
- Check server NTP synchronization
- Verify 2-step tolerance setting

### Debug Logging

Enable detailed authentication logging:

```bash
# In .env
LOG_LEVEL=debug
AUTH_DEBUG=true
```

Check logs:
```bash
# Token generation
[INFO] Token pair generated { userId: 'usr-12345', tokenId: 'tkn_...', expiresIn: '900s' }

# Token validation
[WARN] Token validation failed { reason: 'Token has been revoked' }

# MFA verification
[INFO] MFA challenge created { userId: 'usr-12345', method: 'totp', challengeId: 'mfa_...' }
[WARN] MFA verification failed { challengeId: 'mfa_...', remainingAttempts: 2 }

# Session timeout
[WARN] Session expired due to inactivity { sessionId: 'sess_...', inactiveMinutes: 35 }
```

---

## Security Checklist

Before deploying to production:

- [ ] All JWT secrets are cryptographically random (64+ chars)
- [ ] MFA encryption keys are secure (32+ chars)
- [ ] Database credentials are strong and unique
- [ ] Redis is password-protected and uses TLS
- [ ] PostgreSQL uses SSL connections
- [ ] Environment variables are not committed to git
- [ ] `BYPASS_AUTH` is false or removed
- [ ] `NODE_ENV` is set to `production`
- [ ] Token expiry times are configured appropriately
- [ ] Rate limiting is enabled on all auth endpoints
- [ ] Audit logging is enabled and monitored
- [ ] SMS/Email providers are configured correctly
- [ ] Backup codes are generated for all MFA users
- [ ] Session timeouts are appropriate for each role
- [ ] Integration tests pass successfully
- [ ] Security scan shows no vulnerabilities
- [ ] HTTPS is enforced (no HTTP)
- [ ] CORS is configured correctly
- [ ] CSP headers are set
- [ ] Security headers (HSTS, X-Frame-Options, etc.) are configured

---

## Support and Maintenance

### Monitoring

Monitor these metrics:
- Failed login attempts per minute
- Token refresh rate
- MFA verification success rate
- Session timeout frequency
- Average session duration
- Concurrent session count
- Token blacklist size

### Alerts

Set up alerts for:
- High rate of failed logins (potential brute force)
- Token reuse detected (security incident)
- MFA failures spike (user issue or attack)
- Session hijacking detected (IP/device change)
- Database connection failures
- Redis connection failures

### Maintenance Tasks

**Daily:**
- Review authentication audit logs
- Check for security alerts
- Monitor error rates

**Weekly:**
- Review and acknowledge security alerts
- Analyze authentication patterns
- Check token blacklist size

**Monthly:**
- Rotate JWT secrets (if policy requires)
- Review and update security configurations
- Audit MFA enrollment rates
- Review session timeout settings

---

## Changelog

### Version 1.0 (2026-02-08)
- Initial implementation
- JWT token management with rotation
- Token blacklisting system
- Session timeout enforcement
- TOTP/SMS/Email/Backup code MFA
- MFA integration with login flow
- Session security with device fingerprinting
- Comprehensive documentation

---

## License

Internal use only - Xpress Ops Tower
Confidential and Proprietary

---

**Document Maintained By:** Security Engineering Team
**Last Review:** 2026-02-08
**Next Review:** 2026-03-08
