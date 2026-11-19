import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';
import { isValidUuid } from '@/lib/uuid';
import { hashSessionToken, buildSessionCookieOptions } from '@/lib/auth';

describe('uuid & auth primitives', () => {
  it('accepts valid UUIDs and rejects sequential integers or malformed strings', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuid('1')).toBe(false);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('')).toBe(false);
  });

  it('hashes and verifies passwords with unique random salts', () => {
    const h1 = hashPassword('SuperSecret#2026');
    const h2 = hashPassword('SuperSecret#2026');
    expect(h1).not.toBe(h2);
    expect(verifyPassword('SuperSecret#2026', h1)).toBe(true);
    expect(verifyPassword('WrongPass', h1)).toBe(false);
  });

  it('hashes session tokens deterministically with SHA-256 and sets HttpOnly cookie options', () => {
    const digest = hashSessionToken('raw-token-abc');
    expect(digest).toHaveLength(64);
    expect(digest).not.toBe('raw-token-abc');
    const opts = buildSessionCookieOptions(3600);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
  });
});
