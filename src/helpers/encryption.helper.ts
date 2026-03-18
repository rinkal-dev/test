/**
 * Encryption Helper
 *
 * Provides AES-256-GCM encryption for storing sensitive data in the database.
 * Uses the JWT_SECRET as the encryption key (must be at least 32 characters).
 *
 * SECURITY FEATURES:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Random IV for each encryption
 * - Authentication tag to prevent tampering
 * - Key derived from JWT_SECRET
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from JWT_SECRET
 * Uses SHA-256 to derive a consistent 32-byte key
 */
const getEncryptionKey = (): Buffer => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for encryption');
  }

  // Derive a 32-byte key using SHA-256
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt a string value
 *
 * @param plainText - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:cipherText (base64)
 */
export const encryptValue = (plainText: string): string => {
  if (!plainText) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and ciphertext (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt value');
  }
};

/**
 * Decrypt an encrypted value
 *
 * @param encryptedValue - The encrypted string in format: iv:authTag:cipherText
 * @returns Decrypted plain text string
 */
export const decryptValue = (encryptedValue: string): string => {
  if (!encryptedValue) {
    return '';
  }

  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      // Not encrypted or invalid format - return as-is (backward compatibility)
      return encryptedValue;
    }

    const [ivBase64, authTagBase64, cipherText] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return empty string on decryption failure (don't expose error details)
    return '';
  }
};

/**
 * Check if a value appears to be encrypted
 *
 * @param value - The value to check
 * @returns true if the value looks like an encrypted string
 */
export const isEncrypted = (value: string): boolean => {
  if (!value) return false;

  const parts = value.split(':');
  if (parts.length !== 3) return false;

  // Check if all parts are valid base64
  try {
    parts.forEach((part) => {
      Buffer.from(part, 'base64');
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Mask a sensitive value for display
 *
 * @param value - The value to mask
 * @param showLast - Number of characters to show at the end (default: 4)
 * @returns Masked string like "••••••••abcd"
 */
export const maskValue = (value: string, showLast: number = 4): string => {
  if (!value) return '';

  if (value.length <= showLast) {
    return '•'.repeat(8);
  }

  const visiblePart = value.slice(-showLast);
  const maskedLength = Math.min(value.length - showLast, 12);

  return '•'.repeat(maskedLength) + visiblePart;
};

/**
 * Generate a secure random string (for API keys, etc.)
 *
 * @param length - Length of the string (default: 32)
 * @returns Random alphanumeric string
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};
