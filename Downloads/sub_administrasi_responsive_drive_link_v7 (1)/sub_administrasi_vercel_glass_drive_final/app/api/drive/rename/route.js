import { requireSession } from '@/lib/session';
import { jsonResponse } from '@/lib/drive-common';
import { renameFile } from '@/lib/drive-service';

export const runtime = 'nodejs';

export async function PATCH(request) {
  try {
    requireSession();
    const body = await request.json();
    const fileId = String(body.fileId || '');
    const name = String(body.name || '').trim();
    if (!fileId || !name) return jsonResponse({ ok: false, message: 'fileId dan nama wajib diisi.' }, 400);
    const item = await renameFile(fileId, name);
    return jsonResponse({ ok: true, item });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Rename gagal.' }, error.status || 500);
  }
}
