'use server';

import { redirect } from 'next/navigation';
import { login, logout } from '@/lib/auth';
import { requestPasswordReset } from '@/lib/account-emails';
import { consumeToken } from '@/lib/tokens';
import { findUserById, setPassword } from '@/lib/users';
import { isValidEmail } from '@/lib/validation';
import { str, type FormState } from './shared';

export async function loginAction(_: FormState, data: FormData): Promise<FormState> {
  const email = str(data, 'email', 200);
  const password = str(data, 'password', 200);
  if (!email || !password || !(await login(email, password))) {
    return { error: 'Incorrect email or password.', values: { email } };
  }
  redirect('/');
}

export async function logoutAction() {
  await logout();
  redirect('/login');
}

export async function forgotPasswordAction(_: FormState, data: FormData): Promise<FormState> {
  const email = str(data, 'email', 200);
  if (!isValidEmail(email)) return { error: 'Enter the email address you sign in with.', values: { email } };
  await requestPasswordReset(email);
  // Same answer whether or not an account exists.
  return { ok: 'If that email belongs to a team member, a reset link is on its way. It is valid for one hour.' };
}

/** Used for both invitation links (first password) and reset links. */
export async function setPasswordAction(token: string, _: FormState, data: FormData): Promise<FormState> {
  const password = str(data, 'password', 200);
  const confirm = str(data, 'confirm', 200);
  const fieldErrors: Record<string, string> = {};
  if (password.length < 8) fieldErrors.password = 'Use at least 8 characters.';
  else if (password !== confirm) fieldErrors.confirm = 'The two passwords do not match.';
  if (Object.keys(fieldErrors).length) return { error: 'Please fix the highlighted fields.', fieldErrors };

  // Validated first so a typo doesn't burn the single-use link.
  const used = await consumeToken(token);
  if (!used) return { error: 'This link has expired or was already used. Ask for a new one.' };
  const user = await findUserById(used.userId);
  if (!user || !user.active) return { error: 'This account is no longer active.' };

  await setPassword(user._id, password);
  redirect(`/login?notice=${used.purpose === 'invite' ? 'welcome' : 'reset'}`);
}
