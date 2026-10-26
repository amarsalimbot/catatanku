import { requireSession } from '@/lib/session';
import { jsonResponse } from '@/lib/drive-common';
import { listFolder } from '@/lib/drive-service';
import { getFolderLogos } from '@/lib/store';

export const runtime = 'nodejs';

function attachStoredLogo(item, logos) {
  if (!item || item.type !== 'folder') return item;
  const logo = logos?.[item.id];
  if (!logo?.logoDataUrl) return item;
  return {
    ...item,
    folderLogoFileId: `redis-logo-${item.id}`,
    folderLogoName: logo.logoName || item.folderLogoName || 'logo-folder.webp',
    folderLogoLink: logo.logoDataUrl,
    folderLogoThumbnailLink: logo.logoDataUrl,
    folderLogoWebViewLink: logo.logoDataUrl,
    folderLogoUpdatedAt: logo.updatedAt || ''
  };
}

export async function GET(request) {
  try {
    requireSession();
    const { searchParams } = new URL(request.url);
    const data = await listFolder({
      folderId: searchParams.get('folderId') || '',
      pageToken: searchParams.get('pageToken') || '',
      pageSize: Number(searchParams.get('pageSize') || 60),
      query: searchParams.get('query') || '',
      type: searchParams.get('type') || 'all'
    });

    let logos = {};
    try {
      logos = await getFolderLogos();
    } catch {}

    return jsonResponse({
      ok: true,
      ...data,
      items: (data.items || []).map((item) => attachStoredLogo(item, logos))
    });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Gagal membaca Google Drive.' }, error.status || 500);
  }
}
