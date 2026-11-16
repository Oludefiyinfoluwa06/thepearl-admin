'use client';

import { useActionState } from 'react';
import { updateClientAction } from '@/app/actions/clients';
import SubmitButton from '@/components/SubmitButton';
import { Field, Notice, inputClass } from '@/components/ui';

export default function EditClientForm({ clientId, client }: { clientId: string; client: { name: string; email: string; phone: string | null } }) {
  const [state, action] = useActionState(updateClientAction.bind(null, clientId), null);
  const e = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4">
      {state?.error && !state.fieldErrors && <Notice tone="error">{state.error}</Notice>}
      <Field label="Full name" htmlFor="e_name" error={e.name}>
        <input id="e_name" name="name" required defaultValue={v.name ?? client.name} className={inputClass} />
      </Field>
      <Field label="Email" htmlFor="e_email" error={e.email}>
        <input id="e_email" name="email" type="email" required defaultValue={v.email ?? client.email} className={inputClass} />
      </Field>
      <Field label="Phone / WhatsApp" htmlFor="e_phone" optional>
        <input id="e_phone" name="phone" type="tel" defaultValue={v.phone ?? client.phone ?? ''} className={inputClass} />
      </Field>
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
