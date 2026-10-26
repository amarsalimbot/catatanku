import { clearSessionCookie } from '@/lib/session';
import { jsonResponse } from '@/lib/drive-common';

export const runtime = 'nodejs';

export async function POST() {
  clearSessionCookie();
  return jsonResponse({ ok: true });
}
