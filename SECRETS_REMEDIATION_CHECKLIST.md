# Phase 1D: Secrets Remediation Checklist
## Quick Reference for Immediate Action

**Date Generated:** February 8, 2026
**Priority:** CRITICAL - Complete within 24-48 hours
**Status:** 🔴 NOT PRODUCTION READY

---

## IMMEDIATE ACTION ITEMS (CRITICAL - Complete TODAY)

### ✅ Task 1: Remove .env.production from Git [30 minutes]

```bash
# 1. Remove from git tracking
cd /Users/nathan/Desktop/Current_OpsTowerV1_2026
git rm --cached .env.production

# 2. Add to .gitignore (if not already there)
echo ".env.production" >> .gitignore

# 3. Commit the removal
git add .gitignore
git commit -m "security: remove .env.production from git tracking

BREAKING CHANGE: Production credentials removed from repository.
All secrets must now be configured via environment variables or secrets manager.

Affected files:
- .env.production (removed from tracking)

Action required:
- Update deployment pipelines to use GitHub Secrets
- Configure AWS Secrets Manager or HashiCorp Vault
- Rotate all exposed credentials immediately"

# 4. Verify removal
git ls-files | grep .env.production  # Should return nothing

# 5. Push to remote
git push origin main
```

**Status:** [ ] Complete
**Completed By:** _______________
**Date:** _______________

---

### ✅ Task 2: Rotate ALL Compromised Credentials [1 hour]

#### 2.1 Generate New JWT Secrets
```bash
# Generate new secrets
export NEW_JWT_SECRET=$(openssl rand -hex 32)
export NEW_JWT_ACCESS_SECRET=$(openssl rand -hex 32)
export NEW_JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Print for manual configuration
echo "JWT_SECRET=$NEW_JWT_SECRET"
echo "JWT_ACCESS_SECRET=$NEW_JWT_ACCESS_SECRET"
echo "JWT_REFRESH_SECRET=$NEW_JWT_REFRESH_SECRET"

# Save to secure location (NOT in git)
cat > ~/.opstower-secrets << EOF
JWT_SECRET=$NEW_JWT_SECRET
JWT_ACCESS_SECRET=$NEW_JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$NEW_JWT_REFRESH_SECRET
EOF
chmod 600 ~/.opstower-secrets
```

**Status:** [ ] Complete
**New JWT_SECRET generated:** [ ] Yes [ ] No
**Stored securely:** [ ] Yes [ ] No

#### 2.2 Generate New Database Encryption Key
```bash
# Generate new encryption key
export NEW_DB_ENCRYPTION_KEY=$(openssl rand -hex 32)

echo "DATABASE_ENCRYPTION_KEY=$NEW_DB_ENCRYPTION_KEY"
echo "$NEW_DB_ENCRYPTION_KEY" >> ~/.opstower-secrets
```

**Status:** [ ] Complete
**New encryption key generated:** [ ] Yes [ ] No

#### 2.3 Rotate Database Password
```bash
# Generate new password
export NEW_DB_PASSWORD=$(openssl rand -base64 24)

# Update PostgreSQL
psql -U postgres -c "ALTER USER ops_tower_user WITH PASSWORD '$NEW_DB_PASSWORD';"

# Update application configuration
echo "DATABASE_PASSWORD=$NEW_DB_PASSWORD" >> ~/.opstower-secrets
```

**Status:** [ ] Complete
**Database password updated:** [ ] Yes [ ] No

#### 2.4 Generate New VAPID Keys
```bash
# Install web-push if not already installed
npm install -g web-push

# Generate keys
npx web-push generate-vapid-keys

# Save output to secure location
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key>
# VAPID_PRIVATE_KEY=<private-key>
```

**Status:** [ ] Complete
**VAPID keys generated:** [ ] Yes [ ] No

#### 2.5 Update GitHub Secrets
```bash
# Update GitHub repository secrets
# Go to: https://github.com/YOUR_ORG/YOUR_REPO/settings/secrets/actions

# Add/Update these secrets:
# - JWT_SECRET
# - JWT_ACCESS_SECRET
# - JWT_REFRESH_SECRET
# - DATABASE_PASSWORD
# - DATABASE_ENCRYPTION_KEY
# - VAPID_PRIVATE_KEY
```

**Status:** [ ] Complete
**GitHub Secrets updated:** [ ] Yes [ ] No

---

### ✅ Task 3: Fix Docker Compose Hardcoded Secrets [30 minutes]

#### 3.1 Update docker-compose.yml
```bash
cd /Users/nathan/Desktop/Current_OpsTowerV1_2026

# Backup original
cp docker-compose.yml docker-compose.yml.backup

# Update JWT_SECRET
sed -i '' 's/JWT_SECRET=production-jwt-secret-change-in-production/JWT_SECRET=${JWT_SECRET}/g' docker-compose.yml

# Update Grafana password
sed -i '' 's/GF_SECURITY_ADMIN_PASSWORD=admin123/GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}/g' docker-compose.yml

# Verify changes
git diff docker-compose.yml
```

**Status:** [ ] Complete
**docker-compose.yml updated:** [ ] Yes [ ] No

#### 3.2 Update docker-compose.emergency.yml
```bash
# Remove EMERGENCY_AUTH_BYPASS (security risk)
sed -i '' '/EMERGENCY_AUTH_BYPASS/d' docker-compose.emergency.yml

# Verify changes
git diff docker-compose.emergency.yml
```

**Status:** [ ] Complete
**Emergency auth bypass removed:** [ ] Yes [ ] No

#### 3.3 Create .env for Docker Compose
```bash
# Create .env file for docker-compose (NOT committed to git)
cat > .env << 'EOF'
JWT_SECRET=$(openssl rand -hex 32)
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 24)
EMERGENCY_API_KEY=$(openssl rand -hex 32)
EMERGENCY_DB_PASSWORD=$(openssl rand -base64 24)
EOF

# Generate actual values
JWT_SECRET=$(openssl rand -hex 32)
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 24)
EMERGENCY_API_KEY=$(openssl rand -hex 32)
EMERGENCY_DB_PASSWORD=$(openssl rand -base64 24)

cat > .env << EOF
JWT_SECRET=$JWT_SECRET
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
EMERGENCY_API_KEY=$EMERGENCY_API_KEY
EMERGENCY_DB_PASSWORD=$EMERGENCY_DB_PASSWORD
EOF

chmod 600 .env
```

**Status:** [ ] Complete
**.env file created:** [ ] Yes [ ] No

---

### ✅ Task 4: Fix Hardcoded VAPID Keys in Source Code [15 minutes]

```bash
cd /Users/nathan/Desktop/Current_OpsTowerV1_2026

# Edit the file
nano src/lib/realtime/pushNotificationService.ts

# Replace lines 91-97 with:
```

```typescript
private initializeVapidKeys(): void {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID keys are required for push notifications. ' +
      'Generate with: npx web-push generate-vapid-keys'
    );
  }

  this.vapidKeys = { publicKey, privateKey };
}
```

**Status:** [ ] Complete
**Source code updated:** [ ] Yes [ ] No
**Tested locally:** [ ] Yes [ ] No

---

### ✅ Task 5: Commit All Security Fixes [15 minutes]

```bash
cd /Users/nathan/Desktop/Current_OpsTowerV1_2026

# Stage all changes
git add docker-compose.yml
git add docker-compose.emergency.yml
git add src/lib/realtime/pushNotificationService.ts
git add .gitignore

# Commit with detailed message
git commit -m "security: fix hardcoded credentials and secrets

BREAKING CHANGE: All hardcoded secrets removed from codebase.

Changes:
- docker-compose.yml: Remove hardcoded JWT_SECRET and Grafana password
- docker-compose.emergency.yml: Remove EMERGENCY_AUTH_BYPASS flag
- pushNotificationService.ts: Remove hardcoded VAPID keys
- .gitignore: Ensure .env.production is ignored

Security fixes:
- JWT secrets now loaded from environment variables
- Grafana password now configurable via env vars
- VAPID keys must be provided (no fallback)
- Emergency auth bypass feature removed

Migration required:
- Set JWT_SECRET environment variable
- Set GRAFANA_ADMIN_PASSWORD environment variable
- Generate and set VAPID keys
- Update deployment scripts

References:
- Security Audit: SECRETS_AUDIT_REPORT.md
- Complete .env template: .env.example.complete

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to remote
git push origin main
```

**Status:** [ ] Complete
**Changes committed:** [ ] Yes [ ] No
**Pushed to remote:** [ ] Yes [ ] No

---

## HIGH PRIORITY TASKS (Complete within 1 week)

### ✅ Task 6: Setup AWS Secrets Manager [4 hours]

#### 6.1 Install AWS CLI
```bash
# macOS
brew install awscli

# Verify installation
aws --version
```

**Status:** [ ] Complete

#### 6.2 Configure AWS Credentials
```bash
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: ap-southeast-1
# - Default output format: json
```

**Status:** [ ] Complete

#### 6.3 Create Secrets in AWS Secrets Manager
```bash
# JWT Secret
aws secretsmanager create-secret \
  --name opstower/jwt-secret \
  --description "JWT signing secret for OpsTower" \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-southeast-1

# JWT Access Secret
aws secretsmanager create-secret \
  --name opstower/jwt-access-secret \
  --description "JWT access token secret" \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-southeast-1

# JWT Refresh Secret
aws secretsmanager create-secret \
  --name opstower/jwt-refresh-secret \
  --description "JWT refresh token secret" \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-southeast-1

# Database Password
aws secretsmanager create-secret \
  --name opstower/database-password \
  --description "PostgreSQL database password" \
  --secret-string "$(openssl rand -base64 24)" \
  --region ap-southeast-1

# Database Encryption Key
aws secretsmanager create-secret \
  --name opstower/database-encryption-key \
  --description "Database field-level encryption key" \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-southeast-1

# Redis Password
aws secretsmanager create-secret \
  --name opstower/redis-password \
  --description "Redis authentication password" \
  --secret-string "$(openssl rand -base64 24)" \
  --region ap-southeast-1
```

**Status:** [ ] Complete
**Secrets created in AWS:** [ ] Yes [ ] No

#### 6.4 Grant IAM Permissions
```bash
# Create IAM policy for secret access
cat > opstower-secrets-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:ap-southeast-1:*:secret:opstower/*"
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name OpsTowerSecretsReadPolicy \
  --policy-document file://opstower-secrets-policy.json

# Attach to your application role
aws iam attach-role-policy \
  --role-name OpsTowerApplicationRole \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/OpsTowerSecretsReadPolicy
```

**Status:** [ ] Complete
**IAM permissions configured:** [ ] Yes [ ] No

---

### ✅ Task 7: Update Application to Use Secrets Manager [2 hours]

Create new file: `src/lib/secrets/aws-secrets-manager.ts`

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'ap-southeast-1'
});

// Cache secrets in memory (5 minute TTL)
const secretCache = new Map<string, { value: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretName: string): Promise<string> {
  // Check cache first
  const cached = secretCache.get(secretName);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} has no string value`);
    }

    // Cache the secret
    secretCache.set(secretName, {
      value: response.SecretString,
      expires: Date.now() + CACHE_TTL
    });

    return response.SecretString;
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretName}:`, error);
    throw new Error(`Failed to retrieve secret: ${secretName}`);
  }
}

// Helper to get multiple secrets at once
export async function getSecrets(secretNames: string[]): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};

  await Promise.all(
    secretNames.map(async (name) => {
      secrets[name] = await getSecret(name);
    })
  );

  return secrets;
}

// Clear cache (useful for testing)
export function clearSecretCache(): void {
  secretCache.clear();
}
```

**Status:** [ ] Complete
**File created:** [ ] Yes [ ] No
**Tested locally:** [ ] Yes [ ] No

---

### ✅ Task 8: Update .env.example with Complete Documentation [30 minutes]

```bash
cd /Users/nathan/Desktop/Current_OpsTowerV1_2026

# Backup old .env.example
cp .env.example .env.example.old

# Copy new complete template
cp .env.example.complete .env.example

# Verify
git diff .env.example
```

**Status:** [ ] Complete
**.env.example updated:** [ ] Yes [ ] No

---

### ✅ Task 9: Add Pre-commit Hook [15 minutes]

```bash
cd /Users/nathan/Desktop/Current_OpsTowerV1_2026

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
set -e

echo "Running pre-commit security checks..."

# Check for .env files being committed
if git diff --cached --name-only | grep -qE "^\.env(\.(local|production|development))?$"; then
  echo "❌ ERROR: Attempting to commit .env file!"
  echo "Rejected: .env files should never be committed to version control"
  exit 1
fi

# Check for hardcoded secrets patterns
if git diff --cached --diff-filter=d | grep -qE "(password|secret|key|token)\s*=\s*['\"][^'\"]{20,}['\"]"; then
  echo "⚠️  WARNING: Potential hardcoded secret detected"
  echo "Please review your changes carefully:"
  git diff --cached --diff-filter=d | grep -E "(password|secret|key|token)\s*=\s*['\"][^'\"]{20,}['\"]" || true
  echo ""
  echo "If this is intentional (e.g., example values), continue."
  read -p "Continue with commit? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check for AWS keys
if git diff --cached --diff-filter=d | grep -qE "(AKIA|ASIA)[A-Z0-9]{16}"; then
  echo "❌ ERROR: AWS access key detected!"
  echo "Rejected: AWS keys should never be committed"
  exit 1
fi

echo "✅ Pre-commit checks passed"
exit 0
EOF

# Make executable
chmod +x .git/hooks/pre-commit

# Test hook
echo "Testing pre-commit hook..."
.git/hooks/pre-commit
```

**Status:** [ ] Complete
**Pre-commit hook installed:** [ ] Yes [ ] No
**Tested successfully:** [ ] Yes [ ] No

---

## MEDIUM PRIORITY TASKS (Complete within 2 weeks)

### ✅ Task 10: Implement Secret Scanning in CI/CD [2 hours]

Create: `.github/workflows/secret-scanning.yml`

```yaml
name: Secret Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  gitleaks:
    name: Gitleaks Secret Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

  trufflehog:
    name: TruffleHog Secret Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Run TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --json --only-verified
```

**Status:** [ ] Complete
**GitHub workflow created:** [ ] Yes [ ] No

---

### ✅ Task 11: Document Incident Response Plan [1 hour]

**Status:** [ ] Complete
**Documentation created:** [ ] Yes [ ] No

---

## VERIFICATION & TESTING

### ✅ Final Verification Checklist

```bash
# 1. Verify .env.production is not in git
git ls-files | grep .env.production
# Expected: (no output)

# 2. Verify .env files are ignored
git check-ignore -v .env .env.local .env.production
# Expected: All should show .gitignore match

# 3. Verify no hardcoded secrets in source
grep -r "password\|secret\|key" src/ --include="*.ts" --include="*.tsx" \
  | grep -E "(password|secret|key)\s*=\s*['\"][^'\"]{20,}['\"]"
# Expected: (no matches or only placeholders)

# 4. Verify Docker configs use env vars
grep -E "(JWT_SECRET|GRAFANA|EMERGENCY_AUTH_BYPASS)" docker-compose*.yml
# Expected: All should use ${VAR} syntax, no EMERGENCY_AUTH_BYPASS

# 5. Test application startup
npm run build
npm run start
# Expected: Throws errors for missing required env vars

# 6. Test with valid secrets
export JWT_SECRET=$(openssl rand -hex 32)
export JWT_ACCESS_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)
npm run start
# Expected: Starts successfully
```

**All verifications passed:** [ ] Yes [ ] No

---

## SIGN-OFF

### Security Team Approval

**Reviewed By:** _______________
**Date:** _______________
**Signature:** _______________

### DevOps Team Approval

**Reviewed By:** _______________
**Date:** _______________
**Signature:** _______________

### Engineering Manager Approval

**Reviewed By:** _______________
**Date:** _______________
**Signature:** _______________

---

## DEPLOYMENT READINESS

- [ ] All CRITICAL tasks completed
- [ ] All HIGH priority tasks completed
- [ ] All secrets rotated
- [ ] AWS Secrets Manager configured
- [ ] GitHub Secrets updated
- [ ] Pre-commit hooks installed
- [ ] CI/CD secret scanning enabled
- [ ] Documentation updated
- [ ] Team trained on new procedures
- [ ] Incident response plan documented
- [ ] Production deployment tested in staging

**Production Deployment Approved:** [ ] Yes [ ] No

**Approved By:** _______________
**Date:** _______________

---

**END OF CHECKLIST**
