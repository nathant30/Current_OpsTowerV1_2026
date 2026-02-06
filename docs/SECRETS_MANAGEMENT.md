# Secrets Management Guide

## OpsTower V1 2026 - Security Coordinator

**Last Updated**: 2026-02-06
**Status**: Production Ready
**Classification**: Security Critical

---

## Table of Contents

1. [Overview](#overview)
2. [Security Principles](#security-principles)
3. [Development Workflow](#development-workflow)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Secret Rotation](#secret-rotation)
7. [Emergency Procedures](#emergency-procedures)
8. [Compliance](#compliance)

---

## Overview

This document provides comprehensive guidance on managing secrets, API keys, credentials, and other sensitive data in the OpsTower platform. Proper secrets management is critical for:

- **Security**: Preventing unauthorized access
- **Compliance**: Meeting BSP, BIR, and LTFRB regulations
- **Operational Safety**: Protecting payment and user data
- **Incident Response**: Enabling rapid secret rotation

### What Are Secrets?

Secrets include any sensitive data that should not be committed to source control:

- API keys (GCash, PayMaya, Google Maps, LTFRB)
- Database credentials
- JWT signing keys
- Encryption keys
- Third-party service credentials (Twilio, SendGrid)
- SSL/TLS certificates and private keys
- OAuth client secrets
- Session secrets

---

## Security Principles

### 1. Never Commit Secrets

**CRITICAL**: Secrets must NEVER be committed to version control.

```typescript
// ❌ NEVER DO THIS
const apiKey = 'sk_live_1234567890abcdef';
const dbPassword = 'MySecretPassword123';

// ✅ ALWAYS DO THIS
const apiKey = process.env.GCASH_API_KEY;
const dbPassword = process.env.DATABASE_PASSWORD;

if (!apiKey) {
  throw new Error('GCASH_API_KEY environment variable is required');
}
```

### 2. Use Environment Variables

All secrets must be accessed via `process.env` and validated at runtime.

### 3. Principle of Least Privilege

Grant only the minimum permissions required for each component.

### 4. Regular Rotation

Rotate secrets regularly, especially after team member departure or suspected compromise.

### 5. Audit Trail

Log all secret access (without logging the actual secret values).

---

## Development Workflow

### Initial Setup

1. **Copy Environment Template**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure Local Secrets**
   Edit `.env.local` with your development credentials:
   ```bash
   # Database
   DATABASE_URL=postgresql://postgres:local_dev_password@localhost:5432/xpress_ops_dev

   # Google Maps (use restricted development key)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...your_dev_key

   # JWT Secrets (generate with: openssl rand -hex 32)
   JWT_SECRET=abc123...your_random_hex
   JWT_ACCESS_SECRET=def456...your_random_hex
   JWT_REFRESH_SECRET=ghi789...your_random_hex
   ```

3. **Verify Gitignore**
   Ensure `.env.local` is in `.gitignore`:
   ```bash
   # Already configured in .gitignore
   .env.local
   .env*.local
   ```

### Generating Secure Secrets

**For JWT and Encryption Keys:**
```bash
# Generate 32-byte (256-bit) random hex string
openssl rand -hex 32
```

**For VAPID Keys (Web Push):**
```bash
npx web-push generate-vapid-keys
```

**For Database Encryption:**
```bash
# Generate 32-byte key for AES-256-GCM
openssl rand -hex 32
```

### Pre-Commit Protection

A pre-commit hook automatically scans for secrets:

```bash
# Installed via husky
.husky/pre-commit
```

If secrets are detected, the commit will be blocked:
```
❌ SECURITY VIOLATION: Secrets detected in staged files!
   Please remove all secrets and use environment variables instead.
```

### Manual Secret Scanning

Scan for secrets before committing:
```bash
# Scan staged files
gitleaks protect --staged --verbose

# Scan entire codebase
gitleaks detect --source . --verbose

# Scan specific file
gitleaks detect --source=./src/config.ts --verbose
```

---

## Production Deployment

### Railway Deployment

1. **Access Environment Variables**
   ```
   Railway Dashboard → Project → Settings → Environment Variables
   ```

2. **Add Required Secrets**
   Copy from `.env.example` and set production values:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://user:password@host:5432/db
   JWT_SECRET=<strong-random-secret>
   GCASH_API_KEY=<production-key>
   ```

3. **Use Railway Secrets Manager**
   ```bash
   # Set via CLI
   railway variables set JWT_SECRET=<value>

   # Bulk import from file
   railway variables --file .env.production
   ```

### Vercel Deployment

1. **Access Environment Variables**
   ```
   Vercel Dashboard → Project → Settings → Environment Variables
   ```

2. **Set Environment Scope**
   - **Production**: Live environment
   - **Preview**: Pull request previews
   - **Development**: Local development

3. **Sensitive Flag**
   Mark secrets as "Sensitive" to hide values in UI.

### AWS Secrets Manager (Optional)

For enterprise deployments:

```typescript
// lib/secrets.ts
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'ap-southeast-1' });

export async function getSecret(secretName: string): Promise<string> {
  const response = await client.getSecretValue({ SecretId: secretName });
  return response.SecretString || '';
}

// Usage
const gcashKey = await getSecret('opstower/production/gcash-api-key');
```

---

## Environment Variables

### Required for All Environments

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment name | `development`, `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | JWT signing key | `openssl rand -hex 32` |
| `JWT_ACCESS_SECRET` | Access token secret | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `openssl rand -hex 32` |

### Production-Only Requirements

| Variable | Description | Required By |
|----------|-------------|-------------|
| `GCASH_API_KEY` | GCash payment API key | Payment processing |
| `PAYMAYA_SECRET_KEY` | PayMaya secret key | Payment processing |
| `LTFRB_API_KEY` | LTFRB integration key | Regulatory compliance |
| `BIR_API_KEY` | BIR tax API key | Tax compliance |
| `DATABASE_ENCRYPTION_KEY` | Database field encryption | Data protection |
| `TWILIO_AUTH_TOKEN` | SMS service token | Driver/passenger SMS |
| `SENDGRID_API_KEY` | Email service key | Notifications |

### Optional Services

| Variable | Description | Use Case |
|----------|-------------|----------|
| `SLACK_WEBHOOK_URL` | Slack alerts webhook | Monitoring alerts |
| `PAGERDUTY_SERVICE_KEY` | PagerDuty integration | Incident management |
| `FIREBASE_SERVER_KEY` | Push notification key | Mobile notifications |

### Validation at Startup

The application validates critical secrets on startup:

```typescript
// lib/config/validation.ts
export function validateProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_ENCRYPTION_KEY',
    'GCASH_API_KEY',
    'LTFRB_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required production secrets: ${missing.join(', ')}`
    );
  }
}
```

---

## Secret Rotation

### Regular Rotation Schedule

| Secret Type | Rotation Frequency | Reason |
|-------------|-------------------|--------|
| JWT Secrets | Every 90 days | Standard security practice |
| Database Passwords | Every 180 days | Compliance requirement |
| API Keys | As needed | When provider recommends |
| Encryption Keys | Annually | Data protection best practice |

### Rotation Procedure

#### 1. JWT Secret Rotation

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Add as secondary secret (deploy with both)
JWT_SECRET=$OLD_SECRET
JWT_SECRET_NEW=$NEW_SECRET

# 3. Update code to accept both
# 4. Deploy
# 5. Wait for all sessions to expire (24h)
# 6. Remove old secret
# 7. Rename NEW_SECRET to JWT_SECRET
```

#### 2. Database Password Rotation

```bash
# 1. Create new database user
CREATE USER xpress_ops_new WITH PASSWORD 'new_secure_password';
GRANT ALL PRIVILEGES ON DATABASE xpress_ops_tower TO xpress_ops_new;

# 2. Update environment variable
DATABASE_URL=postgresql://xpress_ops_new:new_secure_password@host/db

# 3. Deploy application
# 4. Verify connections work
# 5. Remove old user
DROP USER xpress_ops_old;
```

#### 3. API Key Rotation (GCash, PayMaya)

```bash
# 1. Generate new key in provider dashboard
# 2. Update environment variable
GCASH_API_KEY=<new_key>

# 3. Deploy
# 4. Verify transactions work
# 5. Revoke old key in provider dashboard
```

### Emergency Rotation

If a secret is compromised:

1. **Immediate**: Disable/revoke compromised secret in provider
2. **Within 1 hour**: Generate and deploy new secret
3. **Within 4 hours**: Audit access logs for unauthorized usage
4. **Within 24 hours**: Complete incident report
5. **Within 7 days**: Review and update access controls

---

## Emergency Procedures

### Secret Leak Response

**If a secret is accidentally committed to git:**

1. **Immediate Actions**
   ```bash
   # 1. Rotate the secret IMMEDIATELY (highest priority)
   # 2. Revoke the exposed secret in provider dashboard
   # 3. Deploy new secret to all environments
   ```

2. **Git History Cleanup** (use BFG Repo-Cleaner)
   ```bash
   # Install BFG
   brew install bfg

   # Clone fresh copy
   git clone --mirror https://github.com/yourorg/opstower.git

   # Remove secrets
   bfg --replace-text passwords.txt opstower.git

   # Force push (requires admin access)
   cd opstower.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

3. **Notification**
   - Alert security team
   - Document in incident log
   - Update access controls
   - Review with team to prevent recurrence

### Revocation Procedures

**Database Credentials:**
```sql
-- Immediately revoke access
REVOKE ALL PRIVILEGES ON DATABASE xpress_ops_tower FROM compromised_user;
DROP USER compromised_user;

-- Create new user
CREATE USER xpress_ops_new WITH PASSWORD 'new_secure_password';
GRANT ALL PRIVILEGES ON DATABASE xpress_ops_tower TO xpress_ops_new;
```

**GCash API Key:**
```
1. Login to GCash Merchant Dashboard
2. Navigate to API Keys
3. Click "Revoke" on compromised key
4. Generate new key
5. Update environment variables
6. Deploy immediately
```

---

## Compliance

### Philippine Regulatory Requirements

#### BSP (Bangko Sentral ng Pilipinas)

- Payment credentials must be stored encrypted
- Access logs must be maintained for 5 years
- Credentials must be rotated every 180 days
- Multi-factor authentication required for access

#### BIR (Bureau of Internal Revenue)

- Tax API credentials must be secured
- Access limited to authorized personnel
- Audit trail required for all access

#### LTFRB Compliance

- Operator credentials must be secure
- Driver background check API access logged
- Vehicle registration API credentials protected

### Data Privacy Act (DPA)

- Database encryption keys must be strong (AES-256)
- Personal data encryption required
- Breach notification within 72 hours
- Regular security audits required

---

## Security Checklist

### Development

- [ ] `.env.local` contains no production secrets
- [ ] `.env.local` is in `.gitignore`
- [ ] Pre-commit hook is active
- [ ] Secrets validated at application startup
- [ ] No hardcoded credentials in code

### Production

- [ ] All secrets are strong random values
- [ ] Secrets stored in platform secret manager
- [ ] DATABASE_SSL=true
- [ ] MFA enabled for secret access
- [ ] Access logs enabled
- [ ] Rotation schedule established
- [ ] Emergency contacts documented
- [ ] Incident response plan tested

### Continuous

- [ ] Run `gitleaks detect` before each commit
- [ ] Review secret access logs monthly
- [ ] Rotate secrets per schedule
- [ ] Update `.env.example` when adding new secrets
- [ ] Document secret purpose and owner
- [ ] Test secret rotation procedure quarterly

---

## Tools & Resources

### Security Scanning

- **gitleaks**: Secret detection in git repositories
- **TruffleHog**: Find secrets in git history
- **git-secrets**: AWS secret patterns

### Secret Management

- **AWS Secrets Manager**: Enterprise secret storage
- **HashiCorp Vault**: Secret management platform
- **Azure Key Vault**: Microsoft cloud secrets
- **Railway**: Built-in environment variables
- **Vercel**: Built-in environment variables

### Key Generation

```bash
# Random hex (JWT, encryption)
openssl rand -hex 32

# Base64 random
openssl rand -base64 32

# UUID
uuidgen

# VAPID keys (Web Push)
npx web-push generate-vapid-keys
```

---

## Support

### Security Issues

Report security vulnerabilities to: **security@opstower.com**

### Questions

For secrets management questions:
- **Security Coordinator**: See `docs/coordination/SECURITY_COORDINATOR.md`
- **Team Chat**: #security-questions

### Emergency Contact

24/7 Security Hotline: **(Available on internal wiki)**

---

## References

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [BSP Circular on IT Security](https://www.bsp.gov.ph/)
- [Philippine Data Privacy Act](https://www.privacy.gov.ph/)
- [gitleaks Documentation](https://github.com/zricethezav/gitleaks)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Document Owner**: Security Coordinator
**Review Cycle**: Quarterly
**Next Review**: 2026-05-06
