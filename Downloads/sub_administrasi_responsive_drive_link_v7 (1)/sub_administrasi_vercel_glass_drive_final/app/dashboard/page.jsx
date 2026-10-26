import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import DriveDashboard from '@/components/DriveDashboard';

export default function DashboardPage() {
  const session = getSession();
  if (!session) redirect('/login');
  return <DriveDashboard username={session.sub} />;
}
