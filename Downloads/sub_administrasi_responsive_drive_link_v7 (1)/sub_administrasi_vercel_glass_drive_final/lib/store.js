import fs from 'fs/promises';
import path from 'path';
import { cleanStoredHash, isValidPasswordHash } from './security';

const DEFAULT_KEY = process.env.SETTINGS_KEY || 'sub_administrasi_auth';

export function redisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCommand(parts) {
  const base = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const response = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(parts),
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Redis HTTP ${response.status}`);
  }
  return data.result;
}

async function localStorePath() {
  const directory = path.join(process.cwd(), '.data');
  await fs.mkdir(directory, { recursive: true });
  return path.join(directory, 'auth.json');
}

function readHashFromEnv() {
  if (process.env.ADMIN_PASSWORD_HASH_B64) {
    try {
      return Buffer.from(process.env.ADMIN_PASSWORD_HASH_B64, 'base64').toString('utf8').trim();
    } catch {}
  }
  return cleanStoredHash(process.env.ADMIN_PASSWORD_HASH || '');
}

function envAuthSettings() {
  return {
    username: process.env.ADMIN_USERNAME || 'admin',
    passwordHash: readHashFromEnv()
  };
}

function hasUsableAuthSettings(value) {
  return Boolean(value && value.username && isValidPasswordHash(value.passwordHash));
}

export async function getAuthSettings() {
  if (redisConfigured()) {
    const value = await redisCommand(['get', DEFAULT_KEY]);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (hasUsableAuthSettings(parsed)) return parsed;
      } catch {
        if (hasUsableAuthSettings(value)) return value;
      }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const raw = await fs.readFile(await localStorePath(), 'utf8');
      const parsed = JSON.parse(raw);
      if (hasUsableAuthSettings(parsed)) return parsed;
    } catch {}
  }

  return envAuthSettings();
}


const FOLDER_LOGO_KEY = process.env.FOLDER_LOGO_SETTINGS_KEY || 'sub_administrasi_folder_logos';

async function localLogoStorePath() {
  const directory = path.join(process.cwd(), '.data');
  await fs.mkdir(directory, { recursive: true });
  return path.join(directory, 'folder-logos.json');
}

function normalizeFolderLogoPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [folderId, entry] of Object.entries(value)) {
    if (!folderId || !entry) continue;
    const folderName = String(entry.folderName || '').trim();
    const logoDataUrl = String(entry.logoDataUrl || '').trim();
    if (!logoDataUrl.startsWith('data:image/')) continue;
    result[folderId] = {
      folderName,
      logoName: String(entry.logoName || 'logo-folder.webp').trim().slice(0, 160),
      logoDataUrl,
      updatedAt: entry.updatedAt || new Date().toISOString()
    };
  }
  return result;
}

export async function getFolderLogos() {
  if (redisConfigured()) {
    const value = await redisCommand(['get', FOLDER_LOGO_KEY]);
    if (value) {
      try {
        return normalizeFolderLogoPayload(JSON.parse(value));
      } catch {}
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const raw = await fs.readFile(await localLogoStorePath(), 'utf8');
      return normalizeFolderLogoPayload(JSON.parse(raw));
    } catch {}
  }

  return {};
}

export async function saveFolderLogos(logos) {
  const normalized = normalizeFolderLogoPayload(logos);
  const payload = JSON.stringify(normalized);

  if (redisConfigured()) {
    await redisCommand(['set', FOLDER_LOGO_KEY, payload]);
    return { persisted: true, backend: 'redis' };
  }

  if (process.env.NODE_ENV !== 'production') {
    await fs.writeFile(await localLogoStorePath(), payload, 'utf8');
    return { persisted: true, backend: 'local' };
  }

  const error = new Error('Penyimpanan logo folder online belum aktif. Isi UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN di Vercel agar logo tampil di semua device.');
  error.status = 501;
  throw error;
}

export async function saveAuthSettings(settings) {
  const payload = JSON.stringify({
    username: String(settings.username || '').trim(),
    passwordHash: cleanStoredHash(settings.passwordHash)
  });

  if (redisConfigured()) {
    await redisCommand(['set', DEFAULT_KEY, payload]);
    return { persisted: true, backend: 'redis' };
  }

  if (process.env.NODE_ENV !== 'production') {
    await fs.writeFile(await localStorePath(), payload, 'utf8');
    return { persisted: true, backend: 'local' };
  }

  const error = new Error('Penyimpanan settings belum aktif. Isi UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN di Vercel.');
  error.status = 501;
  throw error;
}
