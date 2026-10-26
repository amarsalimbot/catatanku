import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  if (getSession()) redirect('/dashboard');
  return <LoginForm />;
}
