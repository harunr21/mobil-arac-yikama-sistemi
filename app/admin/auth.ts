import 'server-only';

import { cookies } from 'next/headers';
import { ensureDatabase, getRawD1 } from '@/app/lib/db';

export const ADMIN_SESSION_COOKIE = 'admin_session';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD_HASH =
  'pbkdf2$100000$KSmAwdwX04cndEtHqRsc3Q$s7WeKxiJ6iO5D7ZeFHMW6HqH7LSfhBB3PhW-NDColCw';
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

export type AdminUser = {
  username: string;
  displayName: string;
};

type CredentialRecord = { username: string; password_hash: string };

export class AdminAccessError extends Error {
  constructor(message = 'Oturumunuz geçersiz veya süresi dolmuş.') {
    super(message);
    this.name = 'AdminAccessError';
  }
}

export class LoginRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super('Çok fazla başarısız deneme yapıldı. Lütfen biraz sonra tekrar deneyin.');
    this.name = 'LoginRateLimitError';
  }
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  await ensureDatabase();
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const session = await getRawD1()
    .prepare('SELECT username, expires_at FROM admin_sessions WHERE token_hash = ?')
    .bind(tokenHash)
    .first<{ username: string; expires_at: string }>();

  if (!session || session.expires_at <= now) {
    if (session) await getRawD1().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }

  return { username: session.username, displayName: session.username };
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) throw new AdminAccessError();
  return user;
}

export async function authenticateAdmin(username: string, password: string, clientKey: string): Promise<void> {
  await ensureDatabase();
  const db = getRawD1();
  const keyHash = await sha256(clientKey);
  const nowMs = Date.now();
  const attempt = await db.prepare(`SELECT attempt_count, window_started_at, blocked_until
    FROM admin_login_attempts WHERE key_hash = ?`).bind(keyHash).first<{
      attempt_count: number; window_started_at: string; blocked_until: string | null;
    }>();

  if (attempt?.blocked_until && Date.parse(attempt.blocked_until) > nowMs) {
    throw new LoginRateLimitError(Math.ceil((Date.parse(attempt.blocked_until) - nowMs) / 1000));
  }

  const credentials = await getCredentials();
  const usernameMatches = await constantTimeEqual(username, credentials.username);
  const passwordMatches = await verifyPassword(password, credentials.password_hash);
  if (!usernameMatches || !passwordMatches) {
    const windowStartMs = attempt ? Date.parse(attempt.window_started_at) : nowMs;
    const withinWindow = Number.isFinite(windowStartMs) && nowMs - windowStartMs < LOGIN_WINDOW_MS;
    const attemptCount = withinWindow ? (attempt?.attempt_count ?? 0) + 1 : 1;
    const windowStartedAt = new Date(withinWindow ? windowStartMs : nowMs).toISOString();
    const blockedUntil = attemptCount >= MAX_LOGIN_ATTEMPTS
      ? new Date(nowMs + LOGIN_WINDOW_MS).toISOString()
      : null;
    await db.prepare(`INSERT INTO admin_login_attempts (key_hash, attempt_count, window_started_at, blocked_until)
      VALUES (?, ?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET
      attempt_count = excluded.attempt_count, window_started_at = excluded.window_started_at,
      blocked_until = excluded.blocked_until`)
      .bind(keyHash, attemptCount, windowStartedAt, blockedUntil).run();
    if (blockedUntil) throw new LoginRateLimitError(Math.ceil(LOGIN_WINDOW_MS / 1000));
    throw new AdminAccessError('Kullanıcı adı veya şifre hatalı.');
  }

  await db.batch([
    db.prepare('DELETE FROM admin_login_attempts WHERE key_hash = ?').bind(keyHash),
    db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(new Date(nowMs).toISOString()),
    db.prepare(`INSERT OR IGNORE INTO admin_credentials (id, username, password_hash, updated_at)
      VALUES ('primary', ?, ?, ?)`).bind(DEFAULT_USERNAME, DEFAULT_PASSWORD_HASH, new Date(nowMs).toISOString()),
  ]);
  await createSession(credentials.username);
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await ensureDatabase();
    await getRawD1().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function updateAdminCredentials(currentPassword: string, username: string, newPassword: string): Promise<void> {
  await ensureDatabase();
  const credentials = await getCredentials();
  if (!(await verifyPassword(currentPassword, credentials.password_hash))) {
    throw new AdminAccessError('Mevcut şifre hatalı.');
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  const db = getRawD1();
  await db.batch([
    db.prepare(`INSERT INTO admin_credentials (id, username, password_hash, updated_at)
      VALUES ('primary', ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      username = excluded.username, password_hash = excluded.password_hash, updated_at = excluded.updated_at`)
      .bind(username, passwordHash, now),
    db.prepare('DELETE FROM admin_sessions'),
  ]);
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}

async function getCredentials(): Promise<CredentialRecord> {
  const stored = await getRawD1().prepare(`SELECT username, password_hash FROM admin_credentials
    WHERE id = 'primary'`).first<CredentialRecord>();
  return stored ?? { username: DEFAULT_USERNAME, password_hash: DEFAULT_PASSWORD_HASH };
}

async function createSession(username: string): Promise<void> {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toBase64Url(tokenBytes);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000);
  await getRawD1().prepare(`INSERT INTO admin_sessions (token_hash, username, created_at, expires_at)
    VALUES (?, ?, ?, ?)`).bind(await sha256(token), username, now.toISOString(), expiresAt.toISOString()).run();
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, hashText] = stored.split('$');
  const iterations = Number(iterationsText);
  if (algorithm !== 'pbkdf2' || !Number.isInteger(iterations) || iterations < 10_000 || !saltText || !hashText) return false;
  try {
    const salt = fromBase64Url(saltText);
    const expected = fromBase64Url(hashText);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, expected.byteLength * 8);
    return timingSafeEqual(new Uint8Array(bits), expected);
  } catch {
    return false;
  }
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([sha256(left), sha256(right)]);
  return timingSafeEqual(new TextEncoder().encode(leftHash), new TextEncoder().encode(rightHash));
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
