import { requireSession } from '@/lib/session';
import { assertAllowedUpload, jsonResponse } from '@/lib/drive-common';
import { uploadFile } from '@/lib/drive-service';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    requireSession();
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return jsonResponse({ ok: false, message: 'File tidak ditemukan.' }, 400);
    }

    assertAllowedUpload(file);

    const folderId = String(form.get('folderId') || '');
    const conflict = String(form.get('conflict') || 'cancel');
    const buffer = Buffer.from(await file.arrayBuffer());
    const item = await uploadFile({
      folderId,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
      conflict
    });
    return jsonResponse({ ok: true, item });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Upload gagal.', conflict: error.conflict || null }, error.status || 500);
  }
}
