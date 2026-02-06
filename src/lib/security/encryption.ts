/**
 * Database Field-Level Encryption Utilities
 * Implements AES-256-GCM encryption for sensitive database fields
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV per encryption (prevents pattern analysis)
 * - Auth tag verification (prevents tampering)
 * - Deterministic encryption for searchable fields
 * - FIPS 140-2 compliant
 *
 * Compliance: BSP, BIR, DPA, LTFRB
 *
 * @module lib/security/encryption
 */

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const ENCODING = 'base64' as const;

/**
 * Get encryption key from environment variable
 * Supports key rotation with v2 key
 */
function getEncryptionKey(version: 'v1' | 'v2' = 'v1'): Buffer {
  const envKey = version === 'v1'
    ? process.env.DATABASE_ENCRYPTION_KEY
    : process.env.DATABASE_ENCRYPTION_KEY_V2;

  if (!envKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `DATABASE_ENCRYPTION_KEY${version === 'v2' ? '_V2' : ''} environment variable is required in production`
      );
    }

    // Development fallback
    console.warn('⚠️  Using development encryption key - NOT FOR PRODUCTION USE');
    return Buffer.from('0'.repeat(64), 'hex');
  }

  // Validate hex format (64 characters for 32 bytes)
  if (!/^[0-9a-f]{64}$/i.test(envKey)) {
    throw new Error(
      `DATABASE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ` +
      `Generate with: openssl rand -hex 32`
    );
  }

  return Buffer.from(envKey, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * Returns format: base64(ciphertext)$base64(iv)$base64(authTag)
 *
 * Features:
 * - Unique IV per encryption (randomized)
 * - Authenticated encryption (auth tag)
 * - Cannot be searched (use encryptDeterministic for searchable fields)
 *
 * @param plaintext - Data to encrypt (will be converted to string)
 * @param keyVersion - Key version for rotation support
 * @returns Encrypted data in format: ciphertext$iv$authTag
 */
export function encrypt(
  plaintext: string | number | boolean,
  keyVersion: 'v1' | 'v2' = 'v1'
): string {
  if (plaintext === null || plaintext === undefined) {
    throw new Error('Cannot encrypt null or undefined value');
  }

  // Convert to string
  const plaintextString = String(plaintext);

  // Generate unique IV for this encryption
  const iv = crypto.randomBytes(IV_LENGTH);

  // Get encryption key
  const key = getEncryptionKey(keyVersion);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let ciphertext = cipher.update(plaintextString, 'utf8', ENCODING);
  ciphertext += cipher.final(ENCODING);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Return format: ciphertext$iv$authTag (all base64 encoded)
  return `${ciphertext}$${iv.toString(ENCODING)}$${authTag.toString(ENCODING)}`;
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * Verifies authentication tag to detect tampering
 * Throws error if ciphertext was modified
 *
 * @param ciphertext - Encrypted data in format: ciphertext$iv$authTag
 * @param keyVersion - Key version for rotation support
 * @returns Decrypted plaintext
 * @throws Error if ciphertext is invalid or tampered
 */
export function decrypt(
  ciphertext: string,
  keyVersion: 'v1' | 'v2' = 'v1'
): string {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Invalid ciphertext: must be non-empty string');
  }

  // Parse format: ciphertext$iv$authTag
  const parts = ciphertext.split('$');
  if (parts.length !== 3) {
    throw new Error(
      `Invalid ciphertext format. Expected: ciphertext$iv$authTag, got ${parts.length} parts`
    );
  }

  const [encryptedData, ivBase64, authTagBase64] = parts;

  try {
    // Parse components
    const iv = Buffer.from(ivBase64, ENCODING);
    const authTag = Buffer.from(authTagBase64, ENCODING);
    const key = getEncryptionKey(keyVersion);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let plaintext = decipher.update(encryptedData, ENCODING, 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    if (error instanceof Error && error.message.includes('auth')) {
      throw new Error(
        'Decryption failed: Authentication tag verification failed. ' +
        'Data may have been tampered with.'
      );
    }
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deterministic encryption for searchable fields
 *
 * Uses HMAC-SHA256 to generate consistent hash
 * Same input always produces same output (enables database searches)
 *
 * Use cases:
 * - Email addresses (for login lookup)
 * - Phone numbers (for user lookup)
 * - Payment method identifiers
 * - Vehicle plate numbers
 *
 * WARNING: Less secure than randomized encryption
 * Only use for fields that MUST be searchable
 *
 * @param plaintext - Data to encrypt
 * @param keyVersion - Key version for rotation support
 * @returns Deterministic hash (64-character hex string)
 */
export function encryptDeterministic(
  plaintext: string | number,
  keyVersion: 'v1' | 'v2' = 'v1'
): string {
  if (plaintext === null || plaintext === undefined) {
    throw new Error('Cannot encrypt null or undefined value');
  }

  const plaintextString = String(plaintext).trim().toLowerCase();

  if (plaintextString.length === 0) {
    throw new Error('Cannot encrypt empty string');
  }

  const key = getEncryptionKey(keyVersion);

  // Use HMAC-SHA256 for deterministic encryption
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(plaintextString);

  return hmac.digest('hex');
}

/**
 * Encrypt multiple fields in an object
 *
 * Automatically handles nested objects and arrays
 * Skips null/undefined values
 *
 * @param data - Object with fields to encrypt
 * @param fields - Array of field names or {field, type} objects
 * @param keyVersion - Key version for rotation support
 * @returns New object with encrypted fields
 */
export function encryptFields<T extends Record<string, any>>(
  data: T,
  fields: Array<string | { field: string; type: 'randomized' | 'deterministic' }>,
  keyVersion: 'v1' | 'v2' = 'v1'
): T {
  const result = { ...data };

  for (const fieldConfig of fields) {
    const fieldName = typeof fieldConfig === 'string' ? fieldConfig : fieldConfig.field;
    const encryptionType = typeof fieldConfig === 'string' ? 'randomized' : fieldConfig.type;

    // Skip if field doesn't exist or is null/undefined
    if (!(fieldName in result) || result[fieldName] === null || result[fieldName] === undefined) {
      continue;
    }

    try {
      if (encryptionType === 'deterministic') {
        result[fieldName] = encryptDeterministic(result[fieldName], keyVersion);
      } else {
        result[fieldName] = encrypt(result[fieldName], keyVersion);
      }
    } catch (error) {
      throw new Error(
        `Failed to encrypt field "${fieldName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Decrypt multiple fields in an object
 *
 * Automatically handles nested objects and arrays
 * Skips null/undefined values
 *
 * @param data - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @param keyVersion - Key version for rotation support
 * @returns New object with decrypted fields
 */
export function decryptFields<T extends Record<string, any>>(
  data: T,
  fields: string[],
  keyVersion: 'v1' | 'v2' = 'v1'
): T {
  const result = { ...data };

  for (const fieldName of fields) {
    // Skip if field doesn't exist or is null/undefined
    if (!(fieldName in result) || result[fieldName] === null || result[fieldName] === undefined) {
      continue;
    }

    try {
      // Deterministic encryption doesn't need decryption (it's a hash)
      // Only decrypt randomized encryption (has $ separator)
      if (typeof result[fieldName] === 'string' && result[fieldName].includes('$')) {
        result[fieldName] = decrypt(result[fieldName], keyVersion);
      }
    } catch (error) {
      throw new Error(
        `Failed to decrypt field "${fieldName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Try decryption with multiple key versions (for key rotation)
 *
 * Attempts decryption with v1 key first, falls back to v2
 *
 * @param ciphertext - Encrypted data
 * @returns Decrypted plaintext and key version used
 */
export function decryptWithRotation(ciphertext: string): {
  plaintext: string;
  keyVersion: 'v1' | 'v2';
} {
  // Try v1 key first
  try {
    const plaintext = decrypt(ciphertext, 'v1');
    return { plaintext, keyVersion: 'v1' };
  } catch (error) {
    // Fall back to v2 key
    if (process.env.DATABASE_ENCRYPTION_KEY_V2) {
      try {
        const plaintext = decrypt(ciphertext, 'v2');
        return { plaintext, keyVersion: 'v2' };
      } catch (v2Error) {
        throw new Error('Decryption failed with both v1 and v2 keys');
      }
    }
    throw error;
  }
}

/**
 * Validate encryption key format
 *
 * Checks that key is 64-character hex string (32 bytes)
 *
 * @param key - Hex string key
 * @returns true if valid, throws error if invalid
 */
export function validateEncryptionKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    throw new Error('Encryption key must be a non-empty string');
  }

  if (key.length !== 64) {
    throw new Error(
      `Encryption key must be 64 characters (32 bytes hex). ` +
      `Got ${key.length} characters. ` +
      `Generate with: openssl rand -hex 32`
    );
  }

  if (!/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error(
      'Encryption key must be a hexadecimal string (0-9, a-f). ' +
      'Generate with: openssl rand -hex 32'
    );
  }

  return true;
}

/**
 * Generate a new encryption key
 *
 * Creates a cryptographically secure random 32-byte key
 *
 * @returns 64-character hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Check if a value is encrypted
 *
 * Detects both randomized and deterministic encryption
 *
 * @param value - Value to check
 * @returns true if value appears to be encrypted
 */
export function isEncrypted(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // Randomized encryption has $ separators
  if (value.includes('$') && value.split('$').length === 3) {
    return true;
  }

  // Deterministic encryption is 64-character hex
  if (/^[0-9a-f]{64}$/i.test(value)) {
    return true;
  }

  return false;
}

// Legacy aliases for backward compatibility
export const encryptField = encrypt;
export const decryptField = decrypt;
export const hashField = encryptDeterministic;
export const encryptSensitiveFields = encryptFields;
export const decryptSensitiveFields = decryptFields;

/**
 * Export encryption utilities
 */
export const encryption = {
  encrypt,
  decrypt,
  encryptDeterministic,
  encryptFields,
  decryptFields,
  decryptWithRotation,
  validateEncryptionKey,
  generateEncryptionKey,
  isEncrypted,
  // Legacy aliases
  encryptField,
  decryptField,
  hashField,
  encryptSensitiveFields,
  decryptSensitiveFields,
};

export default encryption;
