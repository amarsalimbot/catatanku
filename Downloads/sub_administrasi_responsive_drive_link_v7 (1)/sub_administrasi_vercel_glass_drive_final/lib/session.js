import crypto from 'crypto';
import { cookies } from 'next/headers';
import { base64url, base64urlJson, decodeBase64url, timingSafeEqualText } from './security';

const COOKIE_NAME = 'sub_admin_session';

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-sub-administrasi-session-secret-please-set-env';
  }

  const error = new Error('AUTH_SECRET belum valid. Isi minimal 32 karakter di Environment Variables Vercel.');
  error.status = 500;
  throw error;
}

function sign(data) {
  return base64url(crypto.createHmac('sha256', getSecret()).update(data).digest());
}

export function createSessionToken(username) {
  const now = Math.floor(Date.now() / 1000);
  const hours = Number(process.env.SESSION_HOURS || 8);
  const payload = {
    sub: username,
    iat: now,
    exp: now + Math.max(1, hours) * 60 * 60
  };
  const body = base64urlJson(payload);
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  if (!timingSafeEqualText(signature, expected)) return null;
  try {
    const payload = JSON.parse(decodeBase64url(body));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(token) {
  const hours = Number(process.env.SESSION_HOURS || 8);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(1, hours) * 60 * 60
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
}

export function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return readSessionToken(token);
}

export function requireSession() {
  const session = getSession();
  if (!session) {
    const error = new Error('Session tidak valid.');
    error.status = 401;
    throw error;
  }
  return session;
}
