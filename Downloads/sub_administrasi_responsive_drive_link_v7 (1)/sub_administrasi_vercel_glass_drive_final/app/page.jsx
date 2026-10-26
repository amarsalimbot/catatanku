import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default function HomePage() {
  redirect(getSession() ? '/dashboard' : '/login');
}
