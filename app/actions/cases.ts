'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { findClientsByEmail, openCase } from '@/lib/clients';
import { isValidEmail } from '@/lib/validation';
import { str, values, type FormState } from './shared';

export type EmailCheck =
  | { status: 'empty' | 'invalid' | 'ok' }
  | { status: 'duplicate'; clients: { id: string; full_name: string; email: string; phone: string | null }[] };

/** Live check used by the case screen as the email is typed. The server re-checks on submit. */
export async function checkEmailAction(email: string): Promise<EmailCheck> {
  await requireUser();
  if (!email.trim()) return { status: 'empty' };
  if (!isValidEmail(email)) return { status: 'invalid' };
  const clients = (await findClientsByEmail(email)).map(({ id, full_name, email, phone }) => ({ id, full_name, email, phone }));
  return clients.length ? { status: 'duplicate', clients } : { status: 'ok' };
}

export async function openCaseAction(
  target: { leadId?: string; clientId?: string },
  _: FormState,
  data: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const resolution = str(data, 'resolution');

  const result = await openCase(
    {
      leadId: target.leadId ?? null,
      clientId: target.clientId ?? null,
      email: str(data, 'email', 200),
      service: str(data, 'service'),
      notes: str(data, 'notes', 5000) || null,
      resolution: resolution === 'link' || resolution === 'separate' ? resolution : null,
      linkClientId: str(data, 'link_client_id', 40) || null,
    },
    user,
  );

  if (!result.ok) {
    return {
      error: result.error,
      fieldErrors: result.field ? { [result.field]: result.error } : undefined,
      values: values(data),
    };
  }
  redirect(`/clients/${result.clientId}?case=${result.caseId}`);
}
