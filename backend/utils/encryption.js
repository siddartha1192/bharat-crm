const crypto = require('crypto');

// Use encryption key from environment or generate one for development
// IMPORTANT: In production, always set ENCRYPTION_KEY environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

// Validate encryption key length
if (Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  throw new Error('ENCRYPTION_KEY must be a 32-byte (64 character) hex string');
}

/**
 * Encrypt sensitive data (e.g., OAuth client secrets)
 * Uses AES-256-GCM for authenticated encryption
 *
 * @param {string} text - Plain text to encrypt
 * @returns {string} - JSON string containing encrypted data, IV, and auth tag
 */
function encrypt(text) {
  if (!text) {
    throw new Error('Cannot encrypt empty value');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  });
}

/**
 * Decrypt sensitive data
 * Verifies authentication tag to ensure data integrity
 *
 * @param {string} encryptedJson - JSON string from encrypt() function
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedJson) {
  if (!encryptedJson) {
    throw new Error('Cannot decrypt empty value');
  }

  try {
    const { iv, encryptedData, authTag } = JSON.parse(encryptedJson);

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data - key may be invalid');
  }
}

/**
 * Check if a value is encrypted (has our encryption format)
 *
 * @param {string} value - Value to check
 * @returns {boolean} - True if value appears to be encrypted
 */
function isEncrypted(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  try {
    const parsed = JSON.parse(value);
    return !!(parsed.iv && parsed.encryptedData && parsed.authTag);
  } catch {
    return false;
  }
}

/**
 * Generate a new encryption key (for initial setup)
 * Returns a 32-byte hex string suitable for ENCRYPTION_KEY env variable
 *
 * @returns {string} - 64-character hex string
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  generateEncryptionKey
};
