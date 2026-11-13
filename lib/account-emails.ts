import 'server-only';
import type { ObjectId } from 'mongodb';
import { issueToken, recentlyIssued } from './tokens';
import { appUrl, sendInvite, sendPasswordReset } from './mail';
import { findUserByEmail } from './users';

type Person = { _id: ObjectId; name: string; email: string };

/** Issues a fresh invitation link and emails it. `link` lets the owner share it by hand if email isn't working. */
export async function inviteUser(user: Person, invitedBy: string) {
  const token = await issueToken(user._id, 'invite');
  const link = `${await appUrl()}/set-password?token=${token}`;
  const sent = await sendInvite(user.email, user.name, link, invitedBy);
  return { sent, link };
}

/**
 * Starts a password reset. Deliberately returns nothing: callers must show the same message whether or not
 * the email belongs to an account, so this can't be used to discover who has one.
 */
export async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.active) return;
  if (await recentlyIssued(user._id, 'reset')) return; // at most one email a minute per account
  const token = await issueToken(user._id, 'reset');
  await sendPasswordReset(user.email, user.name, `${await appUrl()}/set-password?token=${token}`);
}
