import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

// Hash of a throwaway password, so unknown emails cost the same time as wrong passwords.
const DUMMY_HASH = hashPassword('not-a-real-password');

export function verifyPassword(password: string, stored: string | null | undefined) {
  const [salt, hash] = (stored || DUMMY_HASH).split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return Boolean(stored) && timingSafeEqual(expected, actual);
}
