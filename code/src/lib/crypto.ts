import { createCipheriv, createDecipheriv, createHash, randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';

export function encryptPath(text: string, secretKey: string): string {
  const key = createHash('sha256').update(secretKey).digest(); // 32 bytes
  const iv = randomBytes(16); // 16 bytes
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Use IV and encrypted text, separated by colon.
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptPath(encryptedText: string, secretKey: string): string {
  const key = createHash('sha256').update(secretKey).digest();
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function hashesMatch(expected: string, actual: string): boolean {
  try {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(actual, 'hex');
    return expectedBuffer.length === actualBuffer.length
      && timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

export function verifyPassword(password: string, salt: string, storedHash: string) {
  const currentHash = hashPassword(password, salt);
  if (hashesMatch(currentHash, storedHash)) {
    return { valid: true, needsRehash: false };
  }

  const legacyHash = createHash('sha256').update(password + salt).digest('hex');
  const legacyMatches = hashesMatch(legacyHash, storedHash);
  return {
    valid: legacyMatches,
    needsRehash: legacyMatches,
  };
}
