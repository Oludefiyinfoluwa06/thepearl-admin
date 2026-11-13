import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getLead } from '@/lib/leads';
import { getClient } from '@/lib/clients';
import { PageHeader } from '@/components/ui';
import CaseForm from './CaseForm';

export const metadata = { title: 'Open case — The Pearl Admin' };

export default async function NewCasePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const leadId = typeof sp.lead === 'string' ? sp.lead : null;
  const clientIdParam = typeof sp.client === 'string' ? sp.client : null;

  const lead = leadId ? await getLead(leadId) : undefined;
  if (leadId && !lead) notFound();
  const clientRef = clientIdParam ?? lead?.client_id;
  const client = clientRef ? await getClient(clientRef) : undefined;
  if (clientIdParam && !client) notFound();
  if (!lead && !client) notFound();

  const personName = client?.full_name ?? lead!.name;
  return (
    <>
      <PageHeader title="Open a case" subtitle={`For ${personName}`} />
      <div className="max-w-2xl">
        <CaseForm
          target={{ leadId: lead?.id, clientId: clientIdParam ?? undefined }}
          client={client ? { id: client.id, name: client.full_name, email: client.email } : null}
          personName={personName}
          initialEmail={lead?.email ?? ''}
          defaultService={lead?.service ?? ''}
        />
      </div>
    </>
  );
}
