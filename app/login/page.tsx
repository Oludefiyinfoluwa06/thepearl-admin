import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';
import { Notice } from '@/components/ui';
import LoginForm from './LoginForm';

export const metadata = { title: 'Sign in — The Pearl Admin' };

const NOTICES: Record<string, string> = {
  welcome: 'Your password is set. Sign in to get started.',
  reset: 'Password updated. Sign in with your new password.',
};

async function LoginNotice({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { notice } = await searchParams;
  const text = typeof notice === 'string' ? NOTICES[notice] : undefined;
  return text ? <div className="mb-5"><Notice tone="success">{text}</Notice></div> : null;
}

async function RedirectIfSignedIn() {
  if (await getUser()) redirect('/');
  return null;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <AuthShell title="Sign in">
      <Suspense>
        <RedirectIfSignedIn />
        <LoginNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
      <p className="mt-5 text-center text-sm">
        <Link href="/forgot-password" className="text-navy font-semibold hover:text-gold">Forgot your password?</Link>
      </p>
    </AuthShell>
  );
}
