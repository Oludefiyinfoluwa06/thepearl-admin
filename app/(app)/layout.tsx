import { Suspense } from 'react';
import Shell from '@/components/Shell';

// Everything here depends on the signed-in user, so it streams in behind a boundary.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex-1 bg-navy-dark" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
