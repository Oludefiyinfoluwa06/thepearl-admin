'use client';

import { useActionState } from 'react';
import { inviteUserAction } from '@/app/actions/team';
import SubmitButton from '@/components/SubmitButton';
import { Field, Notice, inputClass } from '@/components/ui';
import { LinkFallback } from './ResendInvite';

export default function TeamForm() {
  const [state, action] = useActionState(inviteUserAction, null);
  const e = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4">
      {state?.ok && <Notice tone="success">{state.ok}</Notice>}
      {state?.error && <Notice tone={state.link ? 'warn' : 'error'}>{state.error}</Notice>}
      {state?.link && <LinkFallback link={state.link} />}
      <Field label="Name" htmlFor="t_name" error={e.name}>
        <input id="t_name" name="name" required defaultValue={v.name} className={inputClass} />
      </Field>
      <Field label="Email" htmlFor="t_email" error={e.email} hint="They will get an email to choose their own password.">
        <input id="t_email" name="email" type="email" required defaultValue={v.email} className={inputClass} />
      </Field>
      <Field label="Role" htmlFor="t_role">
        <select id="t_role" name="role" defaultValue={v.role ?? 'staff'} className={inputClass}>
          <option value="staff">Staff — leads, clients, cases</option>
          <option value="owner">Owner — everything, plus managing the team</option>
        </select>
      </Field>
      <SubmitButton pendingText="Sending invitation…">Send invitation</SubmitButton>
    </form>
  );
}
