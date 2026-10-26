'use client';

export const LOCAL_FOLDER_LOGOS_KEY = 'sub-admin-local-folder-logos';
export const LOCAL_FOLDER_LOGOS_EVENT = 'sub-admin-local-folder-logos-changed';

export function readLocalFolderLogos() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_FOLDER_LOGOS_KEY) || '{}';
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeLocalFolderLogos(map) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_FOLDER_LOGOS_KEY, JSON.stringify(map || {}));
  window.dispatchEvent(new Event(LOCAL_FOLDER_LOGOS_EVENT));
}

export function saveLocalFolderLogo(folderId, logo) {
  const map = readLocalFolderLogos();
  map[folderId] = {
    id: `local-logo-${folderId}`,
    name: logo?.name || 'logo-folder.webp',
    thumbnailLink: logo?.dataUrl || '',
    webViewLink: logo?.dataUrl || '',
    savedAt: new Date().toISOString()
  };
  writeLocalFolderLogos(map);
  return map[folderId];
}

export function removeLocalFolderLogo(folderId) {
  const map = readLocalFolderLogos();
  delete map[folderId];
  writeLocalFolderLogos(map);
}

export function applyLocalFolderLogo(item, logos = {}) {
  if (!item || item.type !== 'folder') return item;
  const logo = logos[item.id];
  if (!logo?.thumbnailLink && !logo?.webViewLink) return item;
  return {
    ...item,
    folderLogoFileId: logo.id || item.folderLogoFileId || '',
    folderLogoName: logo.name || item.folderLogoName || '',
    folderLogoLink: logo.thumbnailLink || logo.webViewLink || item.folderLogoLink || '',
    folderLogoThumbnailLink: logo.thumbnailLink || item.folderLogoThumbnailLink || '',
    folderLogoWebViewLink: logo.webViewLink || item.folderLogoWebViewLink || ''
  };
}
