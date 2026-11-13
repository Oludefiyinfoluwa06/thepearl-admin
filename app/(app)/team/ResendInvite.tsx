'use client';

import { useActionState } from 'react';
import { resendInviteAction } from '@/app/actions/team';
import SubmitButton from '@/components/SubmitButton';
import { btnGhost } from '@/components/ui';

/** Shown only when SMTP is not working, so the owner can still onboard people by sharing the link. */
export function LinkFallback({ link }: { link: string }) {
  return (
    <input
      readOnly
      value={link}
      aria-label="Invitation link"
      onFocus={(e) => e.currentTarget.select()}
      className="w-full text-xs border border-gray-300 rounded-sm px-2 py-1.5 bg-gray-50 text-gray-700"
    />
  );
}

export default function ResendInvite({ userId }: { userId: string }) {
  const [state, action] = useActionState(resendInviteAction.bind(null, userId), null);
  return (
    <form action={action} className="flex flex-col items-end gap-1.5 max-w-xs">
      <SubmitButton className={`${btnGhost} py-1.5!`} pendingText="Sending…">Resend invite</SubmitButton>
      {state?.ok && <p className="text-xs text-green-700">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-xs text-red-700">{state.error}</p>}
      {state?.link && <LinkFallback link={state.link} />}
    </form>
  );
}
