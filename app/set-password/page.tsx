import Link from 'next/link';
import { Suspense } from 'react';
import AuthShell from '@/components/AuthShell';
import { Notice } from '@/components/ui';
import { peekToken } from '@/lib/tokens';
import { findUserById } from '@/lib/users';
import { connection } from 'next/server';
import SetPasswordForm from './SetPasswordForm';

export const metadata = { title: 'Choose a password — The Pearl Admin', referrer: 'no-referrer' };

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { token } = await searchParams;
  const raw = typeof token === 'string' ? token : '';
  const found = await peekToken(raw);
  const user = found ? await findUserById(found.userId) : null;

  if (!found || !user || !user.active) {
    return (
      <AuthShell title="Link not valid">
        <Notice tone="error">This link has expired or was already used.</Notice>
        <p className="mt-5 text-center text-sm">
          <Link href="/forgot-password" className="text-navy font-semibold hover:text-gold">Request a new link</Link>
        </p>
      </AuthShell>
    );
  }
  const invite = found.purpose === 'invite';
  return (
    <AuthShell title={invite ? `Welcome, ${user.name.split(' ')[0]}` : 'Choose a new password'}>
      <p className="text-sm text-gray-600 mb-5">
        {invite ? 'Choose a password to activate your account.' : `Resetting the password for ${user.email}.`}
      </p>
      <SetPasswordForm token={raw} submitLabel={invite ? 'Activate account' : 'Update password'} />
    </AuthShell>
  );
}

export default function SetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<AuthShell title="One moment…"><p className="text-sm text-gray-500">Checking your link…</p></AuthShell>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
