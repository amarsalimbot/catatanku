import { getSession } from '@/lib/session';
import { jsonResponse } from '@/lib/drive-common';

export const runtime = 'nodejs';

export async function GET() {
  const session = getSession();
  if (!session) return jsonResponse({ ok: false }, 401);
  return jsonResponse({ ok: true, user: { username: session.sub } });
}
