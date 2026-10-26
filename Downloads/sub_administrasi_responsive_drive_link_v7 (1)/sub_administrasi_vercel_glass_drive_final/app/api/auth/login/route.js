import { createSessionToken, setSessionCookie } from '@/lib/session';
import { verifyPassword } from '@/lib/security';
import { getAuthSettings } from '@/lib/store';
import { jsonResponse } from '@/lib/drive-common';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const settings = await getAuthSettings();

    const validUser = username && username === settings.username;
    const validPassword = verifyPassword(password, settings.passwordHash);

    if (!validUser || !validPassword) {
      return jsonResponse({ ok: false, message: 'Username atau password salah.' }, 401);
    }

    const token = createSessionToken(username);
    setSessionCookie(token);
    return jsonResponse({ ok: true, user: { username } });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Login gagal.' }, error.status || 500);
  }
}
