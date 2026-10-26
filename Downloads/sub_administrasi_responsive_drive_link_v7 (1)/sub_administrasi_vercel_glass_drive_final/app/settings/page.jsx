import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import AdminSettings from '@/components/AdminSettings';

export default function SettingsPage() {
  const session = getSession();
  if (!session) redirect('/login');
  return <AdminSettings username={session.sub} />;
}
