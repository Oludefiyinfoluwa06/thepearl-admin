import { requireUser } from '@/lib/auth';
import { listActiveUsers } from '@/lib/users';
import { nowForInput } from '@/lib/format';
import { PageHeader } from '@/components/ui';
import NewLeadForm from './NewLeadForm';

export const metadata = { title: 'New inquiry — The Pearl Admin' };

export default async function NewLeadPage() {
  const user = await requireUser();
  const users = await listActiveUsers();
  return (
    <>
      <PageHeader title="New inquiry" subtitle="Log a WhatsApp message, call or walk-in, along with the free consultation." />
      <NewLeadForm users={users} defaultHeldAt={nowForInput()} currentUserId={user.id} />
    </>
  );
}
