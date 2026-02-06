# Database Encryption Analysis

## OpsTower V1 2026 - Security Coordinator

**Last Updated**: 2026-02-07
**Status**: Implementation Guide
**Issue**: #15 - Database Encryption at Rest
**Classification**: Security Critical

---

## Executive Summary

This document identifies all sensitive data fields in the OpsTower database that require field-level encryption. Encryption will use AES-256-GCM with encryption keys stored in environment variables (not in the database).

### Compliance Requirements

- **BSP (Bangko Sentral ng Pilipinas)**: Financial data encryption mandatory
- **BIR (Bureau of Internal Revenue)**: Tax data protection required
- **DPA (Data Privacy Act)**: Personal information encryption required
- **LTFRB**: Driver and vehicle data protection required

---

## Sensitive Fields Inventory

### 1. User Personal Information (users table)

**High Priority - PII**

| Field | Type | Reason | Compliance |
|-------|------|--------|------------|
| `email` | String | Personal identifier | DPA |
| `firstName` | String | Personal name | DPA |
| `lastName` | String | Personal name | DPA |
| `phone` | String | Contact information | DPA |
| `profile.phone` | String | Backup phone | DPA |
| `profile.bio` | String | May contain personal info | DPA |
| `security.securityQuestions` | Object | Sensitive recovery data | DPA |

**Encryption Strategy**: Searchable fields (email, phone) use deterministic encryption; others use randomized encryption.

### 2. Payment Information (payment_methods, transactions)

**Critical Priority - Financial Data**

| Field | Type | Reason | Compliance |
|-------|------|--------|------------|
| `accountNumber` | String | Account identifier | BSP, DPA |
| `phoneNumber` | String | Payment phone | BSP, DPA |
| `cardLast4` | String | Card info | BSP, PCI-DSS |
| `cardBrand` | String | Payment method | BSP |
| `expiryDate` | String | Card expiry | BSP, PCI-DSS |
| `referenceNumber` | String | Transaction ref | BSP |
| `metadata` | JSON | May contain sensitive data | BSP, DPA |

**Encryption Strategy**: All payment fields use AES-256-GCM randomized encryption.

### 3. Driver Information (drivers table)

**High Priority - Personal & Professional Data**

| Field | Type | Reason | Compliance |
|-------|------|--------|------------|
| `firstName` | String | Driver name | DPA, LTFRB |
| `lastName` | String | Driver name | DPA, LTFRB |
| `middleName` | String | Driver name | DPA, LTFRB |
| `email` | String | Contact | DPA, LTFRB |
| `phone` | String | Contact | DPA, LTFRB |
| `dateOfBirth` | Date | Personal info | DPA, LTFRB |
| `address.*` | Object | Full address | DPA, LTFRB |
| `licenseInfo.licenseNumber` | String | Government ID | LTFRB, DPA |
| `licenseInfo.tinNumber` | String | Tax ID | BIR, DPA |
| `vehicleInfo.plateNumber` | String | Vehicle reg | LTFRB, DPA |
| `vehicleInfo.engineNumber` | String | Vehicle ID | LTFRB |
| `vehicleInfo.chassisNumber` | String | Vehicle ID | LTFRB |
| `documents.*` | Object | ID documents | LTFRB, DPA |

**Encryption Strategy**: Names and contact info use deterministic encryption for search; IDs and documents use randomized encryption.

### 4. Vehicle Information (vehicles table)

**Medium Priority - Asset Data**

| Field | Type | Reason | Compliance |
|-------|------|--------|------------|
| `plateNumber` | String | Vehicle identifier | LTFRB |
| `engineNumber` | String | Vehicle serial | LTFRB |
| `chassisNumber` | String | Vehicle serial | LTFRB |
| `ownerName` | String | Owner name | DPA, LTFRB |
| `ownerPhone` | String | Owner contact | DPA, LTFRB |
| `registrationDocs` | Object | Documents | LTFRB, DPA |

**Encryption Strategy**: Plate numbers use deterministic encryption; serials use randomized.

### 5. Booking & Ride Information (bookings table)

**Medium Priority - Transaction Data**

| Field | Type | Reason | Compliance |
|-------|------|--------|------------|
| `customerName` | String | Customer name | DPA |
| `customerPhone` | String | Customer contact | DPA |
| `customerEmail` | String | Customer email | DPA |
| `pickupAddress` | String | Location data | DPA |
| `dropoffAddress` | String | Location data | DPA |
| `notes` | String | May contain personal info | DPA |
| `paymentDetails` | JSON | Payment info | BSP, DPA |

**Encryption Strategy**: Contact info uses deterministic; addresses and notes use randomized.

### 6. Financial Records (billing, earnings)

**High Priority - Financial Data**

| Field | Type | Reason | Compliance |
|-------|------|--------|------------|
| `accountNumber` | String | Bank account | BSP, DPA |
| `accountName` | String | Account holder | BSP, DPA |
| `bankName` | String | Financial institution | BSP |
| `taxId` | String | Tax identifier | BIR, DPA |
| `paymentDetails` | JSON | Payment info | BSP, DPA |
| `earningsBreakdown` | JSON | Financial data | BIR, BSP |

**Encryption Strategy**: All financial fields use AES-256-GCM randomized encryption.

---

## Encryption Implementation Strategy

### Encryption Method: AES-256-GCM

**Algorithm**: AES-256-GCM (Galois/Counter Mode)
**Key Size**: 256 bits (32 bytes)
**IV Size**: 96 bits (12 bytes) - unique per encryption
**Auth Tag**: 128 bits (16 bytes)

**Benefits**:
- ✅ Authenticated encryption (prevents tampering)
- ✅ FIPS 140-2 compliant
- ✅ Industry standard (BSP, PCI-DSS compliant)
- ✅ Fast performance (hardware acceleration)
- ✅ Unique IV per encryption (prevents pattern analysis)

### Encryption Types

#### 1. Randomized Encryption (Default)

```
For: Most sensitive fields (IDs, documents, notes)
Format: {encrypted_data}${iv}${auth_tag}
- New IV for each encryption
- Cannot search encrypted values
- Maximum security
```

#### 2. Deterministic Encryption (Searchable Fields)

```
For: Fields that need to be searchable (email, phone, plate numbers)
Format: HMAC-SHA256(key + field) → deterministic hash
- Same input = same output
- Enables equality searches
- Less secure than randomized
```

**Usage Guideline**: Only use deterministic encryption for fields that MUST be searchable (login emails, payment method lookups).

### Key Management

```bash
# Generate encryption key (do this once, securely)
openssl rand -hex 32

# Add to environment variables
DATABASE_ENCRYPTION_KEY=<64-character-hex-string>
DATABASE_ENCRYPTION_KEY_V2=<new-key-for-rotation>

# Store in platform secret manager:
# - Railway: Environment Variables (marked as sensitive)
# - Vercel: Environment Variables (marked as sensitive)
# - AWS: Secrets Manager
```

**Key Rotation Strategy**:
1. Generate new key (v2)
2. Add to environment variables
3. Deploy with both keys active
4. Background job re-encrypts all data with v2
5. Remove old key after 30 days

---

## Database Schema Changes

### No Schema Changes Required

**Strategy**: Store encrypted data as text in existing VARCHAR/TEXT columns.

```sql
-- Before encryption:
email VARCHAR(255) = 'user@example.com'

-- After encryption (randomized):
email TEXT = 'f8e7d6c5b4a3...${iv}${tag}'

-- After encryption (deterministic):
email TEXT = 'a1b2c3d4e5f6...deterministic_hash'
```

**Column Size Requirements**:
- **Randomized**: Original size × 3 (base64 overhead + IV + tag)
- **Deterministic**: 64 characters (SHA-256 hash)

**Migration**: Existing VARCHAR columns should be converted to TEXT type to accommodate encrypted data.

---

## Implementation Architecture

### Layer 1: Encryption Utilities

```typescript
// lib/security/encryption.ts

export function encrypt(plaintext: string, key: string): string {
  // AES-256-GCM encryption
  // Returns: base64(ciphertext)$base64(iv)$base64(authTag)
}

export function decrypt(ciphertext: string, key: string): string {
  // AES-256-GCM decryption
  // Verifies auth tag, throws on tampering
}

export function encryptDeterministic(plaintext: string, key: string): string {
  // HMAC-SHA256 for searchable fields
  // Returns: hex(hmac(key, plaintext))
}
```

### Layer 2: Field-Level Encryption Middleware

```typescript
// lib/database/encryption-middleware.ts

interface EncryptionConfig {
  tableName: string;
  encryptedFields: {
    fieldName: string;
    type: 'randomized' | 'deterministic';
  }[];
}

export class EncryptionMiddleware {
  // Intercepts database writes
  async beforeInsert(tableName: string, data: Record<string, any>)

  // Intercepts database reads
  async afterSelect(tableName: string, rows: Record<string, any>[])

  // Query transformation for searches
  transformQuery(tableName: string, query: Record<string, any>)
}
```

### Layer 3: Repository Pattern

```typescript
// lib/database/repositories/UserRepository.ts

export class UserRepository {
  private encryption: EncryptionMiddleware;

  async findByEmail(email: string): Promise<User | null> {
    // Email is deterministic - can search
    const encryptedEmail = this.encryption.encryptDeterministic(email);
    return this.db.query('SELECT * FROM users WHERE email = $1', [encryptedEmail]);
  }

  async create(userData: CreateUserDto): Promise<User> {
    // Middleware automatically encrypts sensitive fields
    return this.db.insert('users', userData);
  }
}
```

---

## Performance Considerations

### Benchmarks (Target)

| Operation | Without Encryption | With Encryption | Overhead |
|-----------|-------------------|-----------------|----------|
| INSERT | 1.2ms | 1.5ms | +25% (acceptable) |
| SELECT | 0.8ms | 1.0ms | +25% (acceptable) |
| UPDATE | 1.5ms | 1.8ms | +20% (acceptable) |
| Bulk INSERT (100) | 45ms | 55ms | +22% (acceptable) |

**Target**: <10% overhead for most operations
**Actual**: Expect 20-30% overhead due to crypto operations

### Optimization Strategies

1. **Hardware Acceleration**: Use AES-NI instructions (automatic in Node.js crypto)
2. **Caching**: Cache decrypted data in Redis for hot paths
3. **Batch Operations**: Encrypt/decrypt in batches for bulk operations
4. **Lazy Decryption**: Only decrypt fields when accessed
5. **Connection Pooling**: Reuse database connections to amortize overhead

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/lib/security/encryption.test.ts

describe('Encryption Utilities', () => {
  test('encrypts and decrypts correctly', () => {
    const plaintext = 'user@example.com';
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  test('deterministic encryption is consistent', () => {
    const plaintext = 'test@example.com';
    const hash1 = encryptDeterministic(plaintext, key);
    const hash2 = encryptDeterministic(plaintext, key);
    expect(hash1).toBe(hash2);
  });

  test('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test', key);
    const tampered = encrypted.slice(0, -5) + 'xxxxx';
    expect(() => decrypt(tampered, key)).toThrow();
  });
});
```

### Integration Tests

```typescript
// __tests__/lib/database/encryption-middleware.test.ts

describe('Database Encryption Middleware', () => {
  test('encrypts on insert', async () => {
    const user = await userRepo.create({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    });

    // Verify encrypted in database
    const raw = await db.raw('SELECT * FROM users WHERE id = $1', [user.id]);
    expect(raw.email).not.toBe('test@example.com');
    expect(raw.email).toMatch(/^[a-f0-9]{64}$/); // deterministic
  });

  test('decrypts on select', async () => {
    const user = await userRepo.findById('123');
    expect(user.email).toBe('test@example.com'); // decrypted
    expect(user.firstName).toBe('John');
  });
});
```

### Performance Tests

```typescript
// __tests__/database/encryption-performance.test.ts

describe('Encryption Performance', () => {
  test('insert overhead < 30%', async () => {
    const iterations = 1000;

    // Without encryption
    const start1 = Date.now();
    for (let i = 0; i < iterations; i++) {
      await db.insert('test_table', { data: `test${i}` });
    }
    const baseline = Date.now() - start1;

    // With encryption
    const start2 = Date.now();
    for (let i = 0; i < iterations; i++) {
      await encryptedRepo.create({ data: `test${i}` });
    }
    const encrypted = Date.now() - start2;

    const overhead = ((encrypted - baseline) / baseline) * 100;
    expect(overhead).toBeLessThan(30);
  });
});
```

---

## Migration Plan

### Phase 1: Implement Encryption Utilities (Day 1)

1. Create `lib/security/encryption.ts`
2. Implement AES-256-GCM encrypt/decrypt
3. Implement deterministic encryption
4. Unit test all functions
5. Performance benchmark

### Phase 2: Create Encryption Middleware (Day 1-2)

1. Create `lib/database/encryption-middleware.ts`
2. Define encryption configs for each table
3. Implement query transformation
4. Integration tests

### Phase 3: Migrate Existing Data (Day 2)

**WARNING**: This requires downtime or careful coordination

```sql
-- Backup database first!
pg_dump opstower_prod > backup_before_encryption.sql

-- Migration script (run during maintenance window)
-- 1. Add temporary columns for encrypted data
ALTER TABLE users ADD COLUMN email_encrypted TEXT;
ALTER TABLE users ADD COLUMN first_name_encrypted TEXT;

-- 2. Encrypt existing data (run via Node.js script)
-- See: scripts/encrypt-existing-data.js

-- 3. Swap columns
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_encrypted TO email;

-- 4. Update application code to use encryption
-- Deploy new version with encryption middleware

-- 5. Verify all data readable
-- 6. Drop backup columns
```

### Phase 4: Rollout to Production (Day 3)

1. **Staging Testing**: Full E2E tests on staging
2. **Performance Validation**: Load test encrypted database
3. **Blue-Green Deployment**: Deploy with rollback plan
4. **Monitoring**: Watch for errors, performance degradation
5. **Verification**: Audit encrypted fields in database

---

## Compliance Mapping

### BSP (Bangko Sentral ng Pilipinas)

**Requirements**:
- ✅ Financial data encrypted at rest
- ✅ AES-256 or stronger encryption
- ✅ Key management documented
- ✅ Access logs for decryption operations

**Covered Fields**:
- Payment methods (account numbers, card data)
- Transaction data
- Financial records
- Earnings data

### BIR (Bureau of Internal Revenue)

**Requirements**:
- ✅ Tax data encrypted
- ✅ Taxpayer info protected
- ✅ Audit trail for access

**Covered Fields**:
- TIN numbers
- Tax IDs
- Earnings breakdowns
- Invoice data

### Data Privacy Act (DPA)

**Requirements**:
- ✅ Personal data encrypted
- ✅ Breach notification capability
- ✅ Data subject rights supported
- ✅ Encryption key rotation

**Covered Fields**:
- Names, emails, phone numbers
- Addresses
- Dates of birth
- All PII fields

### LTFRB

**Requirements**:
- ✅ Driver data protected
- ✅ Vehicle information secure
- ✅ License numbers encrypted

**Covered Fields**:
- Driver names, contacts
- License numbers
- Vehicle plate numbers
- Registration documents

---

## Security Checklist

### Implementation

- [ ] Encryption utilities implemented and tested
- [ ] Middleware configured for all tables
- [ ] Environment variables documented
- [ ] Key rotation procedure documented
- [ ] Performance benchmarks pass (<30% overhead)
- [ ] Integration tests pass
- [ ] Migration script tested on staging

### Deployment

- [ ] Encryption keys generated securely
- [ ] Keys stored in platform secret manager
- [ ] Backup taken before migration
- [ ] Staging environment tested fully
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Team trained on encryption operations

### Post-Deployment

- [ ] Verify encrypted data in database (raw SQL check)
- [ ] Verify decrypted data in application
- [ ] Performance monitoring (no degradation >30%)
- [ ] Audit logs enabled
- [ ] Compliance documentation updated
- [ ] Key rotation scheduled (quarterly)

---

## References

- **NIST Special Publication 800-57**: Key Management
- **NIST Special Publication 800-38D**: GCM Mode
- **BSP Circular on IT Security**: https://www.bsp.gov.ph/
- **Data Privacy Act of 2012**: https://www.privacy.gov.ph/
- **Node.js Crypto**: https://nodejs.org/api/crypto.html
- **OWASP Cryptographic Storage**: https://cheatsheetseries.owasp.org/

---

**Document Owner**: Security Coordinator
**Review Cycle**: Quarterly
**Next Review**: 2026-05-07
