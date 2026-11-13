'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/auth';
import { inviteUser } from '@/lib/account-emails';
import { createUser, emailTaken, findUserById, setUserActive } from '@/lib/users';
import { isValidEmail } from '@/lib/validation';
import { str, type FormState } from './shared';

const NOT_SENT = 'The email could not be sent (check the SMTP settings). Share this link with them instead:';

export async function inviteUserAction(_: FormState, data: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const fieldErrors: Record<string, string> = {};
  const name = str(data, 'name', 100);
  const email = str(data, 'email', 200);
  const role = str(data, 'role') === 'owner' ? 'owner' : 'staff';

  if (!name) fieldErrors.name = 'Enter a name.';
  if (!isValidEmail(email)) fieldErrors.email = 'Enter a valid email address.';
  else if (await emailTaken(email)) fieldErrors.email = 'A team member with this email already exists.';
  if (Object.keys(fieldErrors).length) return { error: 'Please fix the highlighted fields.', fieldErrors, values: { name, email, role } };

  const _id = await createUser({ name, email, role });
  const { sent, link } = await inviteUser({ _id, name, email: email.trim().toLowerCase() }, owner.name);
  revalidatePath('/team');
  return sent ? { ok: `Invitation sent to ${email}.` } : { ok: `${name} was added.`, error: NOT_SENT, link };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature required by useActionState
export async function resendInviteAction(userId: string, _: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const user = await findUserById(userId);
  if (!user || !user.active) return { error: 'That team member no longer exists.' };
  if (user.passwordHash) return { error: 'They have already set a password.' };
  const { sent, link } = await inviteUser(user, owner.name);
  return sent ? { ok: 'Invitation sent again.' } : { error: NOT_SENT, link };
}

export async function setUserActiveAction(userId: string, active: boolean) {
  const owner = await requireOwner();
  if (userId === owner.id) return; // owners can't lock themselves out
  await setUserActive(userId, active); // refuses to deactivate the last active owner
  revalidatePath('/team');
}
