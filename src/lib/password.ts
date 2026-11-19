import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const storedBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = scryptSync(password, salt, storedBuf.length);
  return storedBuf.length === derivedBuf.length && timingSafeEqual(storedBuf, derivedBuf);
}
