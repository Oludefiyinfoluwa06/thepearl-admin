'use client';

import { useActionState } from 'react';
import { setPasswordAction } from '../actions/auth';
import SubmitButton from '@/components/SubmitButton';
import { Field, Notice, btnGold, inputClass } from '@/components/ui';

export default function SetPasswordForm({ token, submitLabel }: { token: string; submitLabel: string }) {
  const [state, action] = useActionState(setPasswordAction.bind(null, token), null);
  const e = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5">
      {state?.error && !state.fieldErrors && <Notice tone="error">{state.error}</Notice>}
      <Field label="New password" htmlFor="password" error={e.password} hint="At least 8 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} autoFocus className={inputClass} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={e.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <SubmitButton className={`${btnGold} w-full py-3.5`} pendingText="Saving…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
