import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'osu_hub_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function getExpectedToken(): string | null {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  return hashPassword(pw);
}

/** Server-side: redirect to /login if not authenticated */
export function requireAuth(): void {
  if (!isAuthEnabled()) return;

  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const expected = getExpectedToken();

  if (!expected || token !== expected) {
    redirect('/login');
  }
}

/** Build the Set-Cookie header value for auth */
export function makeAuthCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;
}

/** Build a clearing Set-Cookie header value */
export function makeClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

/** Check the raw request cookie string against expected token (for API routes) */
export function checkRequestAuth(request: Request): boolean {
  if (!isAuthEnabled()) return true;
  const expected = getExpectedToken();
  if (!expected) return true;

  const cookieHeader = request.headers.get('cookie') ?? '';
  // Parse simple cookie format
  const tokenMatch = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!tokenMatch) return false;
  const token = tokenMatch.slice(COOKIE_NAME.length + 1);
  return token === expected;
}
