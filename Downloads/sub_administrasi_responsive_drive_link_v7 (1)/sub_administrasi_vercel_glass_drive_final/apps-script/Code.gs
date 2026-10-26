/**
 * Apps Script backend untuk SUB Administrasi Drive Manager.
 * Deploy sebagai Web app dengan akses Execute as Me.
 * Script Properties yang didukung:
 * ROOT_FOLDER_ID, ID folder SUB ADMINISTRASI PEMBANGUNAN.
 * ROOT_FOLDER_NAME, default SUB ADMINISTRASI PEMBANGUNAN.
 */
const PROP_ROOT = 'ROOT_FOLDER_ID';
const PROP_ROOT_NAME = 'ROOT_FOLDER_NAME';
const PROP_LOGO_MAP = 'FOLDER_LOGO_MAP';
const PROP_LOGO_STORAGE_FOLDER_ID = 'LOGO_STORAGE_FOLDER_ID';
const DEFAULT_ROOT_NAME = 'SUB ADMINISTRASI PEMBANGUNAN';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const LOGO_STORAGE_FOLDER_NAME = '_SUB_ADMIN_FOLDER_LOGOS';
const LOGO_FILE_PREFIX = '_folder_logo_';

function authorizeDriveAccess() {
  // Kompatibel dengan instruksi lama. Untuk setup terbaru, jalankan setupDrivePermission.
  return setupDrivePermission();
}

function setupDrivePermission() {
  // Jalankan fungsi ini SEKALI dari editor Apps Script.
  // Fungsi ini sengaja membuat folder/file tes lalu langsung menghapusnya,
  // agar Google memunculkan izin Drive yang diperlukan oleh upload file, buat folder, dan upload logo.
  const props = PropertiesService.getScriptProperties();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const tempName = '_SUB_ADMIN_AUTH_TEST_' + stamp;
  let tempFolder = null;
  let tempFile = null;

  try {
    const root = DriveApp.getRootFolder();
    tempFolder = root.createFolder(tempName);
    tempFile = tempFolder.createFile(Utilities.newBlob('Drive authorization OK', 'text/plain', '_auth_check.txt'));
    tempFile.setTrashed(true);
    tempFolder.setTrashed(true);

    props.setProperty('DRIVE_AUTH_READY', 'YES');
    props.setProperty('LAST_AUTH_CHECK', new Date().toISOString());
    return 'OK - izin Google Drive sudah aktif. Sekarang Deploy > Manage deployments > Edit > Version: New version > Deploy.';
  } catch (err) {
    try { if (tempFile) tempFile.setTrashed(true); } catch (ignore) {}
    try { if (tempFolder) tempFolder.setTrashed(true); } catch (ignore) {}
    throw new Error('Izin Google Drive belum aktif. Klik Run pada fungsi setupDrivePermission, pilih akun Google, lalu klik Allow/Izinkan. Detail: ' + (err && err.message ? err.message : err));
  }
}


function setupRootFolder() {
  // Opsional: jalankan jika dashboard masih error folder ID.
  // Fungsi ini mencari folder berdasarkan ROOT_FOLDER_NAME lalu menyimpan ID yang benar ke Script Properties.
  const props = PropertiesService.getScriptProperties();
  const rootName = props.getProperty(PROP_ROOT_NAME) || DEFAULT_ROOT_NAME;
  const folder = resolveRootFolder(rootName);
  props.setProperty(PROP_ROOT, folder.getId());
  return 'OK - ROOT_FOLDER_ID sudah diset ke: ' + folder.getId();
}

function doGet(e) {
  try {
    const action = String(e.parameter.action || 'list');
    if (action === 'authCheck' || action === 'setupDrivePermission') return json({ ok: true, message: setupDrivePermission() });
    if (action !== 'list') return json({ ok: false, status: 400, message: 'Action GET tidak dikenal.' });

    const rootName = String(e.parameter.rootName || PropertiesService.getScriptProperties().getProperty(PROP_ROOT_NAME) || DEFAULT_ROOT_NAME);
    const rootId = resolveRootFolderId(rootName);
    const folderId = cleanDriveId(e.parameter.folderId || rootId);
    const pageSize = Math.min(Math.max(Number(e.parameter.pageSize || 60), 10), 100);
    const pageToken = String(e.parameter.pageToken || '');
    const query = String(e.parameter.query || '').toLowerCase().trim();
    const type = String(e.parameter.type || 'all');

    const result = listFolder(folderId, pageSize, pageToken, query, type);
    return json({ ok: true, folderId: folderId, rootFolderId: rootId, rootFolderName: rootName, items: result.items, nextPageToken: result.nextPageToken });
  } catch (err) {
    return json(formatScriptError(err));
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = String(body.action || '');
    if (action === 'upload') return handleUpload(body);
    if (action === 'createFolder') return handleCreateFolder(body);
    if (action === 'folderLogo') return handleFolderLogo(body);
    if (action === 'rename') return handleRename(body);
    if (action === 'delete') return handleDelete(body);
    return json({ ok: false, status: 400, message: 'Action POST tidak dikenal.' });
  } catch (err) {
    return json(formatScriptError(err));
  }
}

function formatScriptError(err) {
  const raw = err && err.message ? String(err.message) : String(err || '');
  const lower = raw.toLowerCase();
  if (lower.indexOf('tidak memiliki izin') >= 0 || lower.indexOf('permission') >= 0 || lower.indexOf('authorization') >= 0 || lower.indexOf('oauth') >= 0) {
    return {
      ok: false,
      status: 403,
      message: 'Izin Google Drive Apps Script belum aktif atau deployment masih memakai versi lama. Di Google Apps Script, pilih function setupDrivePermission, klik Run, pilih akun Google, klik Allow/Izinkan, lalu Deploy > Manage deployments > Edit > Version: New version > Deploy.'
    };
  }
  if (lower.indexOf('getfolderbyid') >= 0 || lower.indexOf('folder id') >= 0 || lower.indexOf('folder_id') >= 0) {
    return {
      ok: false,
      status: 400,
      message: 'Folder Google Drive tidak bisa dibuka. Biasanya karena DRIVE_ROOT_FOLDER_ID / ROOT_FOLDER_ID salah, berisi link lengkap bukan ID, atau akun pemilik Apps Script tidak punya akses ke folder. Isi hanya ID folder setelah /folders/, atau kosongkan ID agar Apps Script mencari folder berdasarkan nama.'
    };
  }
  return { ok: false, status: 500, message: raw || 'Apps Script error.' };
}

function cleanDriveId(value) {
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

function findRootFolderByName(rootName) {
  const target = String(rootName || DEFAULT_ROOT_NAME).trim();
  const folders = DriveApp.getFoldersByName(target);
  if (folders.hasNext()) return folders.next();
  return null;
}

function resolveRootFolder(rootName) {
  const props = PropertiesService.getScriptProperties();
  const configured = cleanDriveId(props.getProperty(PROP_ROOT));

  if (configured) {
    try {
      const folder = DriveApp.getFolderById(configured);
      props.setProperty(PROP_ROOT, folder.getId());
      return folder;
    } catch (err) {
      // Jika ROOT_FOLDER_ID salah/tidak bisa diakses, fallback ke nama folder agar aplikasi tetap bisa jalan.
      const byName = findRootFolderByName(rootName);
      if (byName) {
        props.setProperty(PROP_ROOT, byName.getId());
        return byName;
      }
      throw new Error('ROOT_FOLDER_ID tidak valid atau tidak bisa diakses oleh akun Apps Script. Isi hanya ID folder Google Drive setelah /folders/, bukan link lengkap. Detail: ' + (err && err.message ? err.message : err));
    }
  }

  const byName = findRootFolderByName(rootName);
  if (byName) {
    props.setProperty(PROP_ROOT, byName.getId());
    return byName;
  }

  throw new Error('Folder ' + (rootName || DEFAULT_ROOT_NAME) + ' belum ditemukan. Buat folder tersebut di Google Drive atau isi ROOT_FOLDER_ID yang benar di Script Properties.');
}

function resolveRootFolderId(rootName) {
  return resolveRootFolder(rootName).getId();
}

function listFolder(folderId, pageSize, pageToken, query, type) {
  const folder = getFolder(folderId);
  const logoMap = getLogoMap();
  const entries = [];

  const folders = folder.getFolders();
  while (folders.hasNext()) {
    const item = folders.next();
    if (item.getName() === LOGO_STORAGE_FOLDER_NAME) continue;
    const row = normalizeFile(item, true, logoMap[item.getId()]);
    if (match(row, query, type)) entries.push(row);
  }

  const files = folder.getFiles();
  while (files.hasNext()) {
    const item = files.next();
    if (item.getName().indexOf(LOGO_FILE_PREFIX) === 0) continue;
    const row = normalizeFile(item, false, null);
    if (match(row, query, type)) entries.push(row);
  }

  entries.sort(function(a, b) {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const start = pageToken ? Number(pageToken) : 0;
  const slice = entries.slice(start, start + pageSize);
  const next = start + pageSize < entries.length ? String(start + pageSize) : '';
  return { items: slice, nextPageToken: next };
}

function handleUpload(body) {
  const rootName = String(body.rootName || PropertiesService.getScriptProperties().getProperty(PROP_ROOT_NAME) || DEFAULT_ROOT_NAME);
  const rootId = resolveRootFolderId(rootName);
  const folderId = cleanDriveId(body.folderId || rootId);
  const folder = getFolder(folderId);
  const name = sanitizeName(body.name || 'file');
  const mimeType = String(body.mimeType || 'application/octet-stream');
  const conflict = String(body.conflict || 'cancel');
  const bytes = Utilities.base64Decode(String(body.data || ''));
  const blob = Utilities.newBlob(bytes, mimeType, name);

  const existing = findFileByName(folder, name);
  if (existing) {
    if (conflict === 'cancel') {
      return json({ ok: false, status: 409, message: 'File dengan nama sama sudah ada.', conflict: normalizeFile(existing, false, null) });
    }
    if (conflict === 'replace') {
      existing.setTrashed(true);
      const replaced = folder.createFile(blob);
      return json({ ok: true, item: normalizeFile(replaced, false, null) });
    }
    if (conflict === 'rename') {
      blob.setName(sanitizeName(body.autoRename || createAutoRename(name)));
    }
  }

  const created = folder.createFile(blob);
  return json({ ok: true, item: normalizeFile(created, false, null) });
}

function handleCreateFolder(body) {
  const rootName = String(body.rootName || PropertiesService.getScriptProperties().getProperty(PROP_ROOT_NAME) || DEFAULT_ROOT_NAME);
  const rootId = resolveRootFolderId(rootName);
  const parentFolderId = cleanDriveId(body.parentFolderId || rootId);
  const parentFolder = getFolder(parentFolderId);
  const name = sanitizeName(body.name || 'Folder Baru');
  const conflict = String(body.conflict || 'cancel');
  let finalName = name;

  const existing = findFolderByName(parentFolder, name);
  if (existing) {
    if (conflict === 'rename') {
      finalName = sanitizeName(body.autoRename || createAutoRename(name));
    } else {
      return json({ ok: false, status: 409, message: 'Folder dengan nama sama sudah ada.', conflict: normalizeFile(existing, true, getLogoMap()[existing.getId()]) });
    }
  }

  const created = parentFolder.createFolder(finalName);
  return json({ ok: true, item: normalizeFile(created, true, null) });
}

function handleFolderLogo(body) {
  // Upload logo sengaja TIDAK membuat folder baru agar tidak memanggil DriveApp.Folder.createFolder.
  // Logo disimpan sebagai file tersembunyi/prefix di folder yang sedang diberi logo.
  String(body.rootName || PropertiesService.getScriptProperties().getProperty(PROP_ROOT_NAME) || DEFAULT_ROOT_NAME);
  const folderId = cleanDriveId(body.folderId || '');
  if (!folderId) return json({ ok: false, status: 400, message: 'folderId wajib diisi.' });

  const folder = getFolder(folderId);
  const storageFolder = getLogoStorageFolder(folder);
  const mimeType = String(body.mimeType || 'image/png');
  const name = sanitizeName(body.name || 'logo.png');
  const bytes = Utilities.base64Decode(String(body.data || ''));
  const fileName = sanitizeName(LOGO_FILE_PREFIX + folderId + '_' + new Date().getTime() + '_' + name);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);

  const logoMap = getLogoMap();
  const oldLogo = logoMap[folderId];
  if (oldLogo && oldLogo.id) {
    try { DriveApp.getFileById(oldLogo.id).setTrashed(true); } catch (err) {}
  }

  const created = storageFolder.createFile(blob);
  try { created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) {}

  const logo = normalizeFile(created, false, null);
  logo.thumbnailLink = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(created.getId()) + '&sz=w700';
  logo.webViewLink = created.getUrl();

  logoMap[folderId] = logo;
  saveLogoMap(logoMap);

  return json({ ok: true, item: normalizeFile(folder, true, logo) });
}

function handleRename(body) {
  const id = cleanDriveId(body.fileId || '');
  const newName = sanitizeName(body.name || 'file');
  try {
    const file = DriveApp.getFileById(id);
    file.setName(newName);
    return json({ ok: true, item: normalizeFile(file, false, null) });
  } catch (err) {
    const folder = DriveApp.getFolderById(id);
    folder.setName(newName);
    return json({ ok: true, item: normalizeFile(folder, true, getLogoMap()[id]) });
  }
}

function handleDelete(body) {
  const id = cleanDriveId(body.fileId || '');
  try {
    DriveApp.getFileById(id).setTrashed(true);
  } catch (err) {
    DriveApp.getFolderById(id).setTrashed(true);
  }
  return json({ ok: true });
}

function getFolder(folderId) {
  const id = cleanDriveId(folderId);
  if (!id) return resolveRootFolder(DEFAULT_ROOT_NAME);
  try {
    return DriveApp.getFolderById(id);
  } catch (err) {
    throw new Error('Folder ID tidak valid atau tidak bisa diakses: ' + id + '. Pastikan ID diambil dari link Google Drive setelah /folders/ dan akun pemilik Apps Script punya akses. Detail: ' + (err && err.message ? err.message : err));
  }
}

function findFileByName(folder, name) {
  const files = folder.getFilesByName(name);
  if (files.hasNext()) return files.next();
  return null;
}

function findFolderByName(folder, name) {
  const folders = folder.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return null;
}

function getLogoStorageFolder(targetFolder) {
  const configured = cleanDriveId(PropertiesService.getScriptProperties().getProperty(PROP_LOGO_STORAGE_FOLDER_ID));
  if (configured) {
    try {
      return DriveApp.getFolderById(configured);
    } catch (err) {
      throw new Error('LOGO_STORAGE_FOLDER_ID tidak valid atau belum bisa diakses. Kosongkan property ini agar logo disimpan di folder terkait.');
    }
  }

  // Logo disimpan langsung di folder terkait agar Apps Script tidak perlu memanggil Folder.createFolder.
  // File logo disembunyikan dari daftar aplikasi dengan prefix LOGO_FILE_PREFIX.
  return targetFolder;
}

function getLogoMap() {
  const raw = PropertiesService.getScriptProperties().getProperty(PROP_LOGO_MAP) || '{}';
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function saveLogoMap(map) {
  PropertiesService.getScriptProperties().setProperty(PROP_LOGO_MAP, JSON.stringify(map || {}));
}

function normalizeFile(item, isFolder, logo) {
  const id = item.getId();
  const name = item.getName();
  const mimeType = isFolder ? FOLDER_MIME : item.getMimeType();
  const output = {
    id: id,
    name: name,
    mimeType: mimeType,
    type: isFolder ? 'folder' : 'file',
    kind: getKind(mimeType, name),
    size: isFolder ? 0 : item.getSize(),
    modifiedTime: item.getLastUpdated().toISOString(),
    webViewLink: item.getUrl(),
    webContentLink: isFolder ? '' : 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id),
    thumbnailLink: isFolder ? '' : 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w700',
    parents: []
  };

  if (isFolder && logo) {
    output.folderLogoFileId = logo.id || '';
    output.folderLogoName = logo.name || '';
    output.folderLogoLink = logo.thumbnailLink || logo.webViewLink || '';
    output.folderLogoThumbnailLink = logo.thumbnailLink || '';
    output.folderLogoWebViewLink = logo.webViewLink || '';
  }

  return output;
}

function match(item, query, type) {
  if (query && item.name.toLowerCase().indexOf(query) === -1) return false;
  if (type === 'all') return true;
  if (type === 'file') return item.type !== 'folder';
  return item.kind === type;
}

function getKind(mime, name) {
  const m = String(mime || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  if (m === FOLDER_MIME) return 'folder';
  if (m.indexOf('image') >= 0 || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(n)) return 'image';
  if (m.indexOf('pdf') >= 0 || n.endsWith('.pdf')) return 'pdf';
  if (m.indexOf('spreadsheet') >= 0 || /\.(xls|xlsx|csv)$/i.test(n)) return 'sheet';
  if (m.indexOf('presentation') >= 0 || /\.(ppt|pptx)$/i.test(n)) return 'slide';
  if (m.indexOf('document') >= 0 || /\.(doc|docx|txt|rtf)$/i.test(n)) return 'doc';
  if (m.indexOf('video') >= 0 || /\.(mp4|mov|avi|mkv|webm)$/i.test(n)) return 'video';
  if (/\.(zip|rar|7z)$/i.test(n)) return 'archive';
  return 'other';
}

function sanitizeName(name) {
  return String(name || 'file').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 180) || 'file';
}

function createAutoRename(name) {
  const safe = sanitizeName(name);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const dot = safe.lastIndexOf('.');
  if (dot > 0) return safe.slice(0, dot) + ' (' + stamp + ')' + safe.slice(dot);
  return safe + ' (' + stamp + ')';
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
