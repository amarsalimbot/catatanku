import { requireSession } from '@/lib/session';
import { jsonResponse, sanitizeFileName } from '@/lib/drive-common';
import { createFolder } from '@/lib/drive-service';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    requireSession();
    const body = await request.json().catch(() => ({}));
    const parentFolderId = String(body.parentFolderId || '');
    const name = sanitizeFileName(body.name || '');
    const conflict = String(body.conflict || 'cancel');

    if (!name) return jsonResponse({ ok: false, message: 'Nama folder wajib diisi.' }, 400);

    const item = await createFolder({ parentFolderId, name, conflict });
    return jsonResponse({ ok: true, item });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Tambah folder gagal.', conflict: error.conflict || null }, error.status || 500);
  }
}
