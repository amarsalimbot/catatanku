import { requireSession } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/security';
import { getAuthSettings, saveAuthSettings } from '@/lib/store';
import { jsonResponse } from '@/lib/drive-common';

export const runtime = 'nodejs';

export async function GET() {
  try {
    requireSession();
    const settings = await getAuthSettings();
    return jsonResponse({ ok: true, username: settings.username, writable: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) || process.env.NODE_ENV !== 'production' });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message }, error.status || 500);
  }
}

export async function PUT(request) {
  try {
    requireSession();
    const body = await request.json();
    const username = String(body.username || '').trim();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const settings = await getAuthSettings();

    if (!username || username.length < 3) {
      return jsonResponse({ ok: false, message: 'Username minimal 3 karakter.' }, 400);
    }
    if (!verifyPassword(currentPassword, settings.passwordHash)) {
      return jsonResponse({ ok: false, message: 'Password lama salah.' }, 401);
    }

    const nextSettings = {
      username,
      passwordHash: newPassword ? hashPassword(newPassword) : settings.passwordHash,
      updatedAt: new Date().toISOString()
    };
    const result = await saveAuthSettings(nextSettings);
    return jsonResponse({ ok: true, username, storage: result.backend });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Gagal menyimpan settings.' }, error.status || 500);
  }
}
