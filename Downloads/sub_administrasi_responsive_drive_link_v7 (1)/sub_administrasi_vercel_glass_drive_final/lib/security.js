import crypto from 'crypto';

export function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function base64urlJson(value) {
  return base64url(JSON.stringify(value));
}

export function decodeBase64url(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function cleanStoredHash(storedHash) {
  return String(storedHash || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\\$/g, '$');
}

export function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function hashPassword(password) {
  const iterations = 210000;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

export function isValidPasswordHash(storedHash) {
  const normalized = cleanStoredHash(storedHash);
  const parts = normalized.split('$');
  return normalized.startsWith('pbkdf2_sha256$') && parts.length === 4;
}

export function verifyPassword(password, storedHash) {
  const normalized = cleanStoredHash(storedHash);
  if (!isValidPasswordHash(normalized)) return false;
  const parts = normalized.split('$');
  const [, iterationText, salt, hash] = parts;
  const iterations = Number(iterationText);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;
  const computed = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('hex');
  return timingSafeEqualText(computed, hash);
}
