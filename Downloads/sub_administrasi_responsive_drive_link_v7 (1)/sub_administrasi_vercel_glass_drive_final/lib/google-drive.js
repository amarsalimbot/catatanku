import crypto from 'crypto';
import {
  FOLDER_MIME,
  LOGO_MAP_FILE_NAME,
  LOGO_STORAGE_FOLDER_NAME,
  attachFolderLogo,
  createAutoRename,
  getRootFolderId,
  getRootFolderName,
  normalizeDriveFile,
  sanitizeFileName
} from './drive-common';

let cachedToken = null;
let googleScopedRootCache = null;
let logoFolderCache = null;

const FILE_FIELDS = 'id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents';

function b64url(value) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getPrivateKey() {
  const raw = process.env.GOOGLE_PRIVATE_KEY || '';
  return raw.replace(/\\n/g, '\n');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();
  if (!email || !privateKey) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL atau GOOGLE_PRIVATE_KEY belum diisi.');

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Gagal mengambil token Google.');

  cachedToken = { token: data.access_token, exp: now + Number(data.expires_in || 3600) };
  return cachedToken.token;
}

async function driveFetch(pathname, options = {}) {
  const token = await getAccessToken();
  const url = pathname.startsWith('https://') ? pathname : `https://www.googleapis.com${pathname}`;
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    cache: 'no-store'
  });

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) data = await response.json();
  else data = await response.text();

  if (!response.ok) throw new Error(data?.error?.message || data?.error_description || data || `Google Drive HTTP ${response.status}`);
  return data;
}

function driveQuery(params, mode = 'read') {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  search.set('supportsAllDrives', 'true');
  if (mode === 'list') {
    search.set('includeItemsFromAllDrives', 'true');
    if (process.env.GOOGLE_SHARED_DRIVE_ID) {
      search.set('driveId', process.env.GOOGLE_SHARED_DRIVE_ID);
      search.set('corpora', 'drive');
    }
  }
  return search.toString();
}

async function findGoogleRootByName() {
  const configuredId = getRootFolderId();
  if (configuredId) return configuredId;
  if (googleScopedRootCache) return googleScopedRootCache;

  const rootName = getRootFolderName().replace(/'/g, "\\'");
  const qs = driveQuery({
    q: `name='${rootName}' and mimeType='${FOLDER_MIME}' and trashed=false`,
    pageSize: '10',
    fields: `files(${FILE_FIELDS})`
  }, 'list');
  const data = await driveFetch(`/drive/v3/files?${qs}`);
  const folder = (data.files || [])[0];
  if (!folder?.id) throw new Error(`Folder ${getRootFolderName()} belum ditemukan. Isi DRIVE_ROOT_FOLDER_ID dengan ID folder Google Drive.`);
  googleScopedRootCache = folder.id;
  return googleScopedRootCache;
}

async function findFilesByName(parentId, name, mimeType = '') {
  const safeName = sanitizeFileName(name).replace(/'/g, "\\'");
  const safeParent = String(parentId).replace(/'/g, "\\'");
  const filters = [`'${safeParent}' in parents`, `name='${safeName}'`, 'trashed=false'];
  if (mimeType) filters.push(`mimeType='${mimeType}'`);
  const qs = driveQuery({
    q: filters.join(' and '),
    pageSize: '10',
    fields: `files(${FILE_FIELDS})`
  }, 'list');
  const data = await driveFetch(`/drive/v3/files?${qs}`);
  return (data.files || []).map(normalizeDriveFile);
}

function multipartBody(metadata, fileBuffer, mimeType) {
  const boundary = `sub_admin_${crypto.randomBytes(12).toString('hex')}`;
  const start = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
  );
  const end = Buffer.from(`\r\n--${boundary}--`);
  return { boundary, body: Buffer.concat([start, fileBuffer, end]) };
}

async function createDriveMetadata(metadata, fields = FILE_FIELDS) {
  const qs = driveQuery({ fields });
  const data = await driveFetch(`/drive/v3/files?${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata)
  });
  return normalizeDriveFile(data);
}

async function uploadMultipart(metadata, buffer, mimeType) {
  const multipart = multipartBody(metadata, buffer, mimeType);
  const qs = driveQuery({ uploadType: 'multipart', fields: FILE_FIELDS });
  const created = await driveFetch(`/upload/drive/v3/files?${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${multipart.boundary}` },
    body: multipart.body
  });
  return normalizeDriveFile(created);
}

async function updateMultipart(fileId, metadata, buffer, mimeType) {
  const multipart = multipartBody(metadata, buffer, mimeType);
  const qs = driveQuery({ uploadType: 'multipart', fields: FILE_FIELDS });
  const updated = await driveFetch(`/upload/drive/v3/files/${encodeURIComponent(fileId)}?${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': `multipart/related; boundary=${multipart.boundary}` },
    body: multipart.body
  });
  return normalizeDriveFile(updated);
}

async function getLogoFolderId(create = true) {
  if (logoFolderCache) return logoFolderCache;
  const rootId = await findGoogleRootByName();
  const existing = await findFilesByName(rootId, LOGO_STORAGE_FOLDER_NAME, FOLDER_MIME);
  if (existing[0]?.id) {
    logoFolderCache = existing[0].id;
    return logoFolderCache;
  }
  if (!create) return '';
  const folder = await createDriveMetadata({ name: LOGO_STORAGE_FOLDER_NAME, mimeType: FOLDER_MIME, parents: [rootId] });
  logoFolderCache = folder.id;
  return logoFolderCache;
}

async function getLogoMapFile() {
  const logoFolderId = await getLogoFolderId(false);
  if (!logoFolderId) return null;
  const files = await findFilesByName(logoFolderId, LOGO_MAP_FILE_NAME, 'application/json');
  return files[0] || null;
}

async function readLogoMap() {
  const mapFile = await getLogoMapFile();
  if (!mapFile?.id) return {};
  const qs = driveQuery({ alt: 'media' });
  const data = await driveFetch(`/drive/v3/files/${encodeURIComponent(mapFile.id)}?${qs}`);
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return {}; }
  }
  return data && typeof data === 'object' ? data : {};
}

async function writeLogoMap(map) {
  const logoFolderId = await getLogoFolderId(true);
  const current = await getLogoMapFile();
  const buffer = Buffer.from(JSON.stringify(map, null, 2));
  const metadata = { name: LOGO_MAP_FILE_NAME, mimeType: 'application/json' };
  if (current?.id) return updateMultipart(current.id, metadata, buffer, 'application/json');
  return uploadMultipart({ ...metadata, parents: [logoFolderId] }, buffer, 'application/json');
}

async function makePublic(fileId) {
  try {
    const qs = driveQuery({ fields: 'id' });
    await driveFetch(`/drive/v3/files/${encodeURIComponent(fileId)}/permissions?${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
  } catch {}
}

export async function listGoogleFolder({ folderId, pageToken = '', pageSize = 60, query = '', type = 'all' }) {
  const parentId = folderId || await findGoogleRootByName();
  const filters = [`'${parentId.replace(/'/g, "\\'")}' in parents`, 'trashed=false'];
  if (query) filters.push(`name contains '${query.replace(/'/g, "\\'")}'`);
  if (type === 'folder') filters.push(`mimeType='${FOLDER_MIME}'`);
  if (type === 'file') filters.push(`mimeType!='${FOLDER_MIME}'`);

  const qs = driveQuery({
    q: filters.join(' and '),
    pageSize: String(Math.min(Math.max(Number(pageSize) || 60, 10), 100)),
    fields: `nextPageToken,files(${FILE_FIELDS})`,
    orderBy: 'folder,name_natural',
    pageToken
  }, 'list');

  const data = await driveFetch(`/drive/v3/files?${qs}`);
  const logoMap = await readLogoMap();
  const files = (data.files || [])
    .map(normalizeDriveFile)
    .filter((item) => item.name !== LOGO_STORAGE_FOLDER_NAME)
    .map((item) => item.type === 'folder' ? attachFolderLogo(item, logoMap[item.id]) : item);
  return { items: files, nextPageToken: data.nextPageToken || '', folderId: parentId };
}

export async function getGoogleFile(fileId) {
  const qs = driveQuery({ fields: FILE_FIELDS });
  const data = await driveFetch(`/drive/v3/files/${encodeURIComponent(fileId)}?${qs}`);
  return normalizeDriveFile(data);
}

async function findByName(folderId, name) {
  const safeName = sanitizeFileName(name).replace(/'/g, "\\'");
  const safeFolder = String(folderId || getRootFolderId() || await findGoogleRootByName()).replace(/'/g, "\\'");
  const qs = driveQuery({
    q: `'${safeFolder}' in parents and name='${safeName}' and trashed=false`,
    pageSize: '10',
    fields: `files(${FILE_FIELDS})`
  }, 'list');
  const data = await driveFetch(`/drive/v3/files?${qs}`);
  return (data.files || []).map(normalizeDriveFile);
}

export async function uploadGoogleFile({ folderId, name, mimeType, buffer, conflict = 'cancel' }) {
  const parentId = folderId || await findGoogleRootByName();
  let finalName = sanitizeFileName(name);
  const existing = await findByName(parentId, finalName);

  if (existing.length) {
    if (conflict === 'cancel') {
      const error = new Error('File dengan nama sama sudah ada.');
      error.status = 409;
      error.conflict = existing[0];
      throw error;
    }
    if (conflict === 'rename') finalName = createAutoRename(finalName);
    if (conflict === 'replace') {
      const target = existing.find((item) => item.type !== 'folder');
      if (!target) {
        const error = new Error('Nama sama dipakai folder. Pilih rename atau cancel.');
        error.status = 409;
        throw error;
      }
      return updateMultipart(target.id, { name: finalName, mimeType: mimeType || 'application/octet-stream' }, buffer, mimeType);
    }
  }

  return uploadMultipart({ name: finalName, parents: [parentId], mimeType: mimeType || 'application/octet-stream' }, buffer, mimeType);
}

export async function createGoogleFolder({ parentFolderId = '', name, conflict = 'cancel' }) {
  const parentId = parentFolderId || await findGoogleRootByName();
  let finalName = sanitizeFileName(name);
  const existing = await findFilesByName(parentId, finalName, FOLDER_MIME);
  if (existing.length) {
    if (conflict === 'rename') finalName = createAutoRename(finalName);
    else {
      const error = new Error('Folder dengan nama sama sudah ada.');
      error.status = 409;
      error.conflict = existing[0];
      throw error;
    }
  }
  return createDriveMetadata({ name: finalName, mimeType: FOLDER_MIME, parents: [parentId] });
}

export async function uploadGoogleFolderLogo({ folderId, name, mimeType, buffer }) {
  if (!folderId) {
    const error = new Error('folderId wajib diisi.');
    error.status = 400;
    throw error;
  }

  const logoFolderId = await getLogoFolderId(true);
  const logoMap = await readLogoMap();
  const oldLogo = logoMap[folderId];
  if (oldLogo?.id) {
    try { await deleteGoogleFile(oldLogo.id); } catch {}
  }

  const extensionSafeName = sanitizeFileName(name || 'logo.png');
  const created = await uploadMultipart({
    name: `${folderId}_${extensionSafeName}`.slice(0, 180),
    parents: [logoFolderId],
    mimeType: mimeType || 'image/png'
  }, buffer, mimeType || 'image/png');
  await makePublic(created.id);

  const logo = {
    id: created.id,
    name: created.name,
    mimeType: created.mimeType,
    modifiedTime: created.modifiedTime,
    webViewLink: created.webViewLink,
    thumbnailLink: created.thumbnailLink || `https://drive.google.com/thumbnail?id=${encodeURIComponent(created.id)}&sz=w700`
  };
  logoMap[folderId] = logo;
  await writeLogoMap(logoMap);

  const folder = await getGoogleFile(folderId);
  return attachFolderLogo(folder, logo);
}

export async function renameGoogleFile(fileId, name) {
  const qs = driveQuery({ fields: FILE_FIELDS });
  const data = await driveFetch(`/drive/v3/files/${encodeURIComponent(fileId)}?${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: sanitizeFileName(name) })
  });
  return normalizeDriveFile(data);
}

export async function deleteGoogleFile(fileId) {
  const qs = driveQuery({ fields: 'id,name,trashed' });
  return driveFetch(`/drive/v3/files/${encodeURIComponent(fileId)}?${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true })
  });
}
