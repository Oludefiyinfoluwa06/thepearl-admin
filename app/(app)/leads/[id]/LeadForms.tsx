'use client';

import { useActionState } from 'react';
import { addConsultationAction, updateLeadContactAction } from '@/app/actions/leads';
import ConsultationFields from '@/components/ConsultationFields';
import SubmitButton from '@/components/SubmitButton';
import { Field, Notice, inputClass } from '@/components/ui';

export function AddConsultationForm({
  leadId,
  users,
  defaultHeldAt,
  currentUserId,
}: {
  leadId: string;
  users: { id: string; name: string }[];
  defaultHeldAt: string;
  currentUserId: string;
}) {
  const [state, action] = useActionState(addConsultationAction.bind(null, leadId), null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <ConsultationFields users={users} defaultHeldAt={defaultHeldAt} defaultHandler={currentUserId} errors={state?.fieldErrors} values={state?.values} />
      <div className="flex justify-end">
        <SubmitButton>Save consultation</SubmitButton>
      </div>
    </form>
  );
}

export function EditContactForm({
  leadId,
  lead,
  emailRequired,
}: {
  leadId: string;
  lead: { name: string; phone: string | null; email: string | null };
  emailRequired: boolean;
}) {
  const [state, action] = useActionState(updateLeadContactAction.bind(null, leadId), null);
  const e = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Full name" htmlFor="c_name" error={e.name}>
        <input id="c_name" name="name" required defaultValue={v.name ?? lead.name} className={inputClass} />
      </Field>
      <Field label="Phone / WhatsApp" htmlFor="c_phone">
        <input id="c_phone" name="phone" type="tel" defaultValue={v.phone ?? lead.phone ?? ''} className={inputClass} />
      </Field>
      <Field label="Email" htmlFor="c_email" error={e.email} optional={!emailRequired}>
        <input id="c_email" name="email" type="email" defaultValue={v.email ?? lead.email ?? ''} className={inputClass} />
      </Field>
      <SubmitButton>Save contact details</SubmitButton>
    </form>
  );
}
