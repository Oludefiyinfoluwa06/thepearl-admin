'use client';

import { useActionState } from 'react';
import { forgotPasswordAction } from '../actions/auth';
import SubmitButton from '@/components/SubmitButton';
import { Field, Notice, btnGold, inputClass } from '@/components/ui';

export default function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  if (state?.ok) return <Notice tone="success">{state.ok}</Notice>;
  return (
    <form action={action} className="space-y-5">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state?.values?.email} className={inputClass} />
      </Field>
      <SubmitButton className={`${btnGold} w-full py-3.5`} pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
