'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { updateClient } from '@/lib/clients';
import { str, values, type FormState } from './shared';

export async function updateClientAction(clientId: string, _: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser();
  const result = await updateClient(
    clientId,
    { name: str(data, 'name', 100), email: str(data, 'email', 200), phone: str(data, 'phone', 40) || null },
    user,
  );
  if (!result.ok) return { error: result.error, fieldErrors: { [result.field]: result.error }, values: values(data) };
  redirect(`/clients/${clientId}?saved=1`);
}
