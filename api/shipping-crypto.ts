import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

function keyBytes() {
  const raw = process.env.SHIPPING_CREDENTIALS_KEY || '';
  if (!raw) throw new Error('shipping_credentials_key_not_configured');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('shipping_credentials_key_must_be_32_bytes_base64');
  return key;
}

export function encryptCredentials(value: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

export function decryptCredentials(payload: string): Record<string, string> {
  const [ivB64, tagB64, dataB64] = String(payload || '').split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('invalid_encrypted_credentials');
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  const value = JSON.parse(plaintext.toString('utf8'));
  if (!value || typeof value !== 'object') throw new Error('invalid_credentials_payload');
  return value as Record<string, string>;
}

export function credentialsFingerprint(value: Record<string, string>) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
