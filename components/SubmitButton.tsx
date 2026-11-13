'use client';

import { useFormStatus } from 'react-dom';
import { btnPrimary } from './ui';

export default function SubmitButton({
  children,
  pendingText = 'Saving…',
  className = btnPrimary,
  disabled,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
