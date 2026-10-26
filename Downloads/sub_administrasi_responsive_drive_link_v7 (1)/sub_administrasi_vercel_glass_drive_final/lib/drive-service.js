import { createGoogleFolder, deleteGoogleFile, listGoogleFolder, renameGoogleFile, uploadGoogleFile, uploadGoogleFolderLogo } from './google-drive';
import { createScriptFolder, deleteScriptFile, listScriptFolder, renameScriptFile, uploadScriptFile, uploadScriptFolderLogo } from './apps-script-drive';

const listCache = new Map();
const LIST_CACHE_TTL_MS = Math.max(0, Number(process.env.DRIVE_LIST_CACHE_SECONDS || 18)) * 1000;
const MAX_CACHE_ENTRIES = 120;

function provider() {
  return (process.env.DRIVE_PROVIDER || 'apps-script').toLowerCase();
}

function cacheKey(input) {
  return JSON.stringify({
    provider: provider(),
    folderId: input?.folderId || '',
    pageToken: input?.pageToken || '',
    pageSize: Number(input?.pageSize || 60),
    query: input?.query || '',
    type: input?.type || 'all'
  });
}

function rememberList(key, data) {
  if (!LIST_CACHE_TTL_MS) return data;
  if (listCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = listCache.keys().next().value;
    if (firstKey) listCache.delete(firstKey);
  }
  listCache.set(key, { expiresAt: Date.now() + LIST_CACHE_TTL_MS, data });
  return data;
}

function readListCache(key) {
  if (!LIST_CACHE_TTL_MS) return null;
  const hit = listCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    listCache.delete(key);
    return null;
  }
  return hit.data;
}

function clearListCache() {
  listCache.clear();
}

export async function listFolder(input) {
  const key = cacheKey(input || {});
  const cached = readListCache(key);
  if (cached) return { ...cached, cached: true };

  const data = provider() === 'google'
    ? await listGoogleFolder(input || {})
    : await listScriptFolder(input || {});

  return rememberList(key, data);
}

export async function uploadFile(input) {
  const result = provider() === 'google' ? await uploadGoogleFile(input) : await uploadScriptFile(input);
  clearListCache();
  return result;
}

export async function createFolder(input) {
  const result = provider() === 'google' ? await createGoogleFolder(input) : await createScriptFolder(input);
  clearListCache();
  return result;
}

export async function uploadFolderLogo(input) {
  const result = provider() === 'google' ? await uploadGoogleFolderLogo(input) : await uploadScriptFolderLogo(input);
  clearListCache();
  return result;
}

export async function renameFile(fileId, name) {
  const result = provider() === 'google' ? await renameGoogleFile(fileId, name) : await renameScriptFile(fileId, name);
  clearListCache();
  return result;
}

export async function deleteFile(fileId) {
  const result = provider() === 'google' ? await deleteGoogleFile(fileId) : await deleteScriptFile(fileId);
  clearListCache();
  return result;
}
