import 'server-only';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import { getStore } from './db';
import { verifyPassword } from './password';
import type { Role } from './constants';

export const SESSION_COOKIE = 'tptt_admin_session';
const SESSION_DAYS = 7;

export type User = { id: string; name: string; email: string; role: Role };

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

export async function login(email: string, password: string): Promise<boolean> {
  const { users, sessions } = await getStore();
  const user = await users.findOne({ email: email.trim().toLowerCase(), active: true });
  const ok = verifyPassword(password, user?.passwordHash);
  if (!user || !ok) return false;

  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await sessions.insertOne({ _id: sha(token), userId: user._id, expiresAt: expires });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
  return true;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await (await getStore()).sessions.deleteOne({ _id: sha(token) });
  jar.delete(SESSION_COOKIE);
}

export async function getUser(): Promise<User | null> {
  // Marks everything after this as request-time work (it uses the current time and the database).
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { users, sessions } = await getStore();
  const session = await sessions.findOne({ _id: sha(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await users.findOne({ _id: session.userId, active: true });
  return user ? { id: user._id.toString(), name: user.name, email: user.email, role: user.role } : null;
}

/** Data-access-layer guard: call at the top of every page and action that touches data. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireOwner(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'owner') redirect('/');
  return user;
}
