export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const LOGO_STORAGE_FOLDER_NAME = '_SUB_ADMIN_FOLDER_LOGOS';
export const LOGO_MAP_FILE_NAME = '_folder_logo_map.json';

export function getRootFolderId() {
  return process.env.DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.APPS_SCRIPT_ROOT_FOLDER_ID || '';
}

export function getRootFolderName() {
  return process.env.DRIVE_ROOT_FOLDER_NAME || process.env.NEXT_PUBLIC_DRIVE_ROOT_NAME || 'SUB ADMINISTRASI PEMBANGUNAN';
}

export function getFileKind(mimeType = '', name = '') {
  const mime = String(mimeType).toLowerCase();
  const fileName = String(name).toLowerCase();
  if (mime === FOLDER_MIME || mime === 'folder') return 'folder';
  if (mime.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg|heic)$/i.test(fileName)) return 'image';
  if (mime.includes('pdf') || fileName.endsWith('.pdf')) return 'pdf';
  if (mime.includes('spreadsheet') || mime.includes('excel') || /\.(xls|xlsx|csv)$/i.test(fileName)) return 'sheet';
  if (mime.includes('presentation') || mime.includes('powerpoint') || /\.(ppt|pptx)$/i.test(fileName)) return 'slide';
  if (mime.includes('document') || mime.includes('word') || /\.(doc|docx|txt|rtf)$/i.test(fileName)) return 'doc';
  if (mime.includes('video') || /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName)) return 'video';
  if (/\.(zip|rar|7z|tar|gz)$/i.test(fileName)) return 'archive';
  return 'other';
}

export function normalizeDriveFile(file) {
  const mimeType = file.mimeType || file.mime || '';
  const id = file.id || file.fileId || '';
  const isFolder = mimeType === FOLDER_MIME || file.type === 'folder';
  const kind = getFileKind(mimeType, file.name || file.title || '');
  return {
    id,
    name: file.name || file.title || 'Tanpa nama',
    mimeType,
    kind,
    type: isFolder ? 'folder' : 'file',
    size: Number(file.size || 0),
    modifiedTime: file.modifiedTime || file.updatedAt || file.lastUpdated || '',
    parents: file.parents || [],
    webViewLink: file.webViewLink || file.url || (id ? `https://drive.google.com/open?id=${encodeURIComponent(id)}` : ''),
    webContentLink: file.webContentLink || file.downloadUrl || (id && !isFolder ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}` : ''),
    thumbnailLink: file.thumbnailLink || file.thumbnailUrl || (id && kind === 'image' ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w700` : ''),
    iconLink: file.iconLink || '',
    path: file.path || file.folderPath || '',
    folderLogoFileId: file.folderLogoFileId || file.logoFileId || file.logo?.id || '',
    folderLogoName: file.folderLogoName || file.logoName || file.logo?.name || '',
    folderLogoLink: file.folderLogoLink || file.logoLink || file.logo?.thumbnailLink || file.logo?.webViewLink || '',
    folderLogoThumbnailLink: file.folderLogoThumbnailLink || file.logoThumbnailLink || file.logo?.thumbnailLink || '',
    folderLogoWebViewLink: file.folderLogoWebViewLink || file.logoWebViewLink || file.logo?.webViewLink || ''
  };
}

export function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

export function sanitizeFileName(name) {
  return String(name || 'file')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'file';
}

export function createAutoRename(name) {
  const safe = sanitizeFileName(name);
  const dot = safe.lastIndexOf('.');
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  if (dot > 0) {
    return `${safe.slice(0, dot)} (${stamp})${safe.slice(dot)}`;
  }
  return `${safe} (${stamp})`;
}

export function assertAllowedUpload(file) {
  const maxMb = Number(process.env.MAX_UPLOAD_MB || 25);
  const maxBytes = Math.max(1, maxMb) * 1024 * 1024;
  if (file.size > maxBytes) {
    const error = new Error(`Ukuran file melebihi batas ${maxMb} MB.`);
    error.status = 413;
    throw error;
  }

  const allowed = String(process.env.ALLOWED_UPLOAD_MIME_PREFIXES || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!allowed.length) return;
  const type = file.type || 'application/octet-stream';
  const ok = allowed.some((prefix) => type === prefix || type.startsWith(prefix));
  if (!ok) {
    const error = new Error(`Tipe file tidak diizinkan: ${type}`);
    error.status = 415;
    throw error;
  }
}


export function attachFolderLogo(item, logo) {
  if (!item || item.type !== 'folder' || !logo) return item;
  return {
    ...item,
    folderLogoFileId: logo.id || logo.fileId || '',
    folderLogoName: logo.name || '',
    folderLogoLink: logo.thumbnailLink || logo.folderLogoLink || logo.webViewLink || '',
    folderLogoThumbnailLink: logo.thumbnailLink || logo.folderLogoThumbnailLink || '',
    folderLogoWebViewLink: logo.webViewLink || logo.folderLogoWebViewLink || ''
  };
}

export function assertAllowedFolderLogo(file) {
  const maxMb = Number(process.env.MAX_FOLDER_LOGO_MB || 5);
  const maxBytes = Math.max(1, maxMb) * 1024 * 1024;
  if (file.size > maxBytes) {
    const error = new Error(`Ukuran logo melebihi batas ${maxMb} MB.`);
    error.status = 413;
    throw error;
  }

  const type = String(file.type || '').toLowerCase();
  if (!type.startsWith('image/')) {
    const error = new Error('Logo folder harus berupa gambar. Gunakan PNG, JPG, WEBP, atau SVG.');
    error.status = 415;
    throw error;
  }
}
