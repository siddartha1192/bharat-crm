#!/usr/bin/env node

/**
 * Generate a secure encryption key for tenant mail configuration
 *
 * This script generates a 32-byte (64-character) hex string suitable
 * for use as the ENCRYPTION_KEY environment variable.
 *
 * Usage:
 *   node scripts/generate-encryption-key.js
 *
 * Then add the output to your .env file:
 *   ENCRYPTION_KEY=<generated_key>
 */

const crypto = require('crypto');

function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

const key = generateEncryptionKey();

console.log('\n' + '='.repeat(70));
console.log('  🔐 ENCRYPTION KEY GENERATOR');
console.log('='.repeat(70));
console.log('\nGenerated a new encryption key:\n');
console.log('  ' + key);
console.log('\n' + '='.repeat(70));
console.log('  📝 NEXT STEPS:');
console.log('='.repeat(70));
console.log('\n1. Add this to your .env file:');
console.log('\n   ENCRYPTION_KEY=' + key);
console.log('\n2. Restart your backend server');
console.log('\n3. Reconfigure mail settings in Settings > API Config > Mail Integration');
console.log('\n   (This will re-encrypt the OAuth client secret with the new key)');
console.log('\n' + '='.repeat(70));
console.log('  ⚠️  IMPORTANT SECURITY NOTES:');
console.log('='.repeat(70));
console.log('\n• Keep this key SECRET - do not commit it to git');
console.log('• If you change this key, you must reconfigure all mail settings');
console.log('• Use the same key across all servers in production');
console.log('• Back up this key securely - losing it means data loss');
console.log('\n' + '='.repeat(70) + '\n');

process.exit(0);
