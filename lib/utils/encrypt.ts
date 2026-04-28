import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'nova_evaluate_32char_secret_key_x';
  // Ensure exactly 32 bytes for AES-256
  return Buffer.from(secret.padEnd(32, '0').slice(0, 32), 'utf-8');
}

export function encryptKey(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptKey(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) return '';
  const [ivHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
