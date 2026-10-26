import { createAutoRename, getRootFolderId, getRootFolderName, normalizeDriveFile, sanitizeFileName } from './drive-common';

let scopedRootCache = null;

function cleanDriveId(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const folderMatch = raw.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idMatch = raw.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  const openMatch = raw.match(/\/d\/([A-Za-z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  return raw.replace(/[?#].*$/, '').trim();
}

function isFolderIdError(error) {
  const text = String(error?.message || '').toLowerCase();
  return text.includes('getfolderbyid') || text.includes('folder id') || text.includes('root_folder_id') || text.includes('drive_root_folder_id');
}

function getUrl() {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) throw new Error('APPS_SCRIPT_URL belum diisi.');
  return url;
}

async function callScript(params = {}, options = {}) {
  const url = new URL(getUrl());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    },
    cache: 'no-store'
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const match = text.match(/^[^(]+\((.*)\);?\s*$/s);
    if (match) {
      try {
        data = JSON.parse(match[1]);
      } catch {
        throw new Error(`Apps Script tidak mengirim JSON valid: ${text.slice(0, 160)}`);
      }
    } else {
      throw new Error(`Apps Script tidak mengirim JSON valid: ${text.slice(0, 160)}`);
    }
  }

  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || data.error || `Apps Script HTTP ${response.status}`);
    error.status = data.status || response.status;
    error.conflict = data.conflict;
    throw error;
  }
  return data;
}

function findScopedFolder(items, rootName) {
  const exact = items.find((item) => item.type === 'folder' && item.name.trim().toLowerCase() === rootName.trim().toLowerCase());
  if (exact) return exact;
  return items.find((item) => item.type === 'folder' && item.name.trim().toLowerCase().includes(rootName.trim().toLowerCase()));
}

async function resolveScriptRootFolderId() {
  if (scopedRootCache) return scopedRootCache;

  const rootName = getRootFolderName();
  const configuredId = cleanDriveId(getRootFolderId());

  const readRootFromScript = async (folderId = '') => {
    const params = { action: 'list', rootName, pageSize: 1, _: Date.now() };
    if (folderId) params.folderId = folderId;
    return callScript(params);
  };

  try {
    const data = await readRootFromScript(configuredId);
    scopedRootCache = cleanDriveId(data.rootFolderId || data.folderId || configuredId);
    return scopedRootCache;
  } catch (error) {
    if (!configuredId || !isFolderIdError(error)) throw error;
    const data = await readRootFromScript('');
    scopedRootCache = cleanDriveId(data.rootFolderId || data.folderId || '');
    return scopedRootCache;
  }
}

export async function listScriptFolder({ folderId = '', pageToken = '', pageSize = 60, query = '', type = 'all' }) {
  const rootName = getRootFolderName();
  const effectiveFolderId = cleanDriveId(folderId) || await resolveScriptRootFolderId();
  const data = await callScript({ action: 'list', folderId: effectiveFolderId, rootName, pageToken, pageSize, query, type, _: Date.now() });
  const raw = Array.isArray(data) ? data : data.items || data.files || data.data || [];
  return {
    items: raw.map(normalizeDriveFile),
    nextPageToken: data.nextPageToken || '',
    folderId: data.folderId || effectiveFolderId || ''
  };
}

export async function uploadScriptFile({ folderId, name, mimeType, buffer, conflict = 'cancel' }) {
  const effectiveFolderId = cleanDriveId(folderId) || await resolveScriptRootFolderId();
  const payload = {
    action: 'upload',
    folderId: effectiveFolderId,
    rootName: getRootFolderName(),
    name: sanitizeFileName(name),
    mimeType: mimeType || 'application/octet-stream',
    conflict,
    autoRename: createAutoRename(name),
    data: buffer.toString('base64')
  };

  const data = await callScript({}, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return normalizeDriveFile(data.item || data.file || data);
}

export async function createScriptFolder({ parentFolderId = '', name, conflict = 'cancel' }) {
  const effectiveParentId = cleanDriveId(parentFolderId) || await resolveScriptRootFolderId();
  const data = await callScript({}, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'createFolder',
      parentFolderId: effectiveParentId,
      rootName: getRootFolderName(),
      name: sanitizeFileName(name),
      conflict,
      autoRename: createAutoRename(name)
    })
  });
  return normalizeDriveFile(data.item || data.folder || data);
}

export async function uploadScriptFolderLogo({ folderId, name, mimeType, buffer }) {
  const data = await callScript({}, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'folderLogo',
      folderId: cleanDriveId(folderId),
      rootName: getRootFolderName(),
      name: sanitizeFileName(name),
      mimeType: mimeType || 'image/png',
      data: buffer.toString('base64')
    })
  });
  return normalizeDriveFile(data.item || data.folder || data);
}

export async function renameScriptFile(fileId, name) {
  const data = await callScript({}, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rename', fileId: cleanDriveId(fileId), rootName: getRootFolderName(), name: sanitizeFileName(name) })
  });
  return normalizeDriveFile(data.item || data.file || data);
}

export async function deleteScriptFile(fileId) {
  return callScript({}, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', fileId: cleanDriveId(fileId), rootName: getRootFolderName() })
  });
}
