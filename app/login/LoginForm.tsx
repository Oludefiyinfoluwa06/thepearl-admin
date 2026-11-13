'use client';

import { useActionState } from 'react';
import { loginAction } from '../actions/auth';
import SubmitButton from '@/components/SubmitButton';
import { Field, Notice, btnGold, inputClass } from '@/components/ui';

export default function LoginForm() {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-5">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state?.values?.email}
          className={inputClass}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <SubmitButton className={`${btnGold} w-full py-3.5`} pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
