import crypto from 'crypto';

const ITERATIONS = 10000;
const KEY_LEN = 64;
const DIGEST = 'sha512';

/**
 * Hash a password using PBKDF2 with SHA-512.
 * Returns a string in format: pbkdf2$iterations$salt$hash
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verify a password against a stored hash.
 * If the stored hash is plain text (legacy/fallback), it does a direct comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith('pbkdf2$')) {
    // Fallback to plain text matching for legacy accounts/testing
    return password === storedHash;
  }

  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    
    const [, iterationsStr, salt, hash] = parts;
    const iterations = parseInt(iterationsStr, 10);
    
    const verifyHash = crypto.pbkdf2Sync(password, salt, iterations, KEY_LEN, DIGEST).toString('hex');
    return verifyHash === hash;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}
