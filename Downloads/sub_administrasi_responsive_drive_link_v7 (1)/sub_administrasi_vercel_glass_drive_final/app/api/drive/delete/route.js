import { requireSession } from '@/lib/session';
import { jsonResponse } from '@/lib/drive-common';
import { deleteFile } from '@/lib/drive-service';

export const runtime = 'nodejs';

export async function DELETE(request) {
  try {
    requireSession();
    const body = await request.json().catch(() => ({}));
    const fileId = String(body.fileId || '');
    if (!fileId) return jsonResponse({ ok: false, message: 'fileId wajib diisi.' }, 400);
    await deleteFile(fileId);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Delete gagal.' }, error.status || 500);
  }
}
