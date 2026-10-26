import { requireSession } from '@/lib/session';
import { jsonResponse } from '@/lib/drive-common';
import { getFolderLogos, saveFolderLogos } from '@/lib/store';

export const runtime = 'nodejs';

const MAX_LOGO_DATA_URL_LENGTH = 420_000;

function normalizeDataUrl(value) {
  const dataUrl = String(value || '').trim();
  if (!dataUrl.startsWith('data:image/')) {
    const error = new Error('Logo folder harus berupa data gambar yang valid.');
    error.status = 415;
    throw error;
  }
  if (dataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
    const error = new Error('Logo terlalu besar untuk disimpan online. Gunakan gambar lebih kecil.');
    error.status = 413;
    throw error;
  }
  return dataUrl;
}

function buildLogoItem(folderId, folderName, logoName, logoDataUrl, savedAt) {
  return {
    id: folderId,
    name: folderName || 'Folder',
    type: 'folder',
    kind: 'folder',
    folderLogoFileId: `redis-logo-${folderId}`,
    folderLogoName: logoName || 'logo-folder.webp',
    folderLogoLink: logoDataUrl,
    folderLogoThumbnailLink: logoDataUrl,
    folderLogoWebViewLink: logoDataUrl,
    folderLogoUpdatedAt: savedAt
  };
}

export async function POST(request) {
  try {
    requireSession();
    const body = await request.json().catch(() => ({}));
    const folderId = String(body.folderId || '').trim();
    const folderName = String(body.folderName || '').trim();
    const logoName = String(body.name || 'logo-folder.webp').trim().slice(0, 160);
    const logoDataUrl = normalizeDataUrl(body.logoDataUrl);

    if (!folderId) return jsonResponse({ ok: false, message: 'folderId wajib diisi.' }, 400);

    const logos = await getFolderLogos();
    const savedAt = new Date().toISOString();
    logos[folderId] = {
      folderName,
      logoName,
      logoDataUrl,
      updatedAt: savedAt
    };

    const saveResult = await saveFolderLogos(logos);

    return jsonResponse({
      ok: true,
      persisted: Boolean(saveResult?.persisted),
      backend: saveResult?.backend || '',
      item: buildLogoItem(folderId, folderName, logoName, logoDataUrl, savedAt)
    });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Upload logo gagal.' }, error.status || 500);
  }
}
