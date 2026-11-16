import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Briefcase, Mail, Phone } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { clientCases, clientLeads, clientTimeline, getClient } from '@/lib/clients';
import { CASE_STATUSES, LEAD_STATUSES, SERVICES, SOURCES, label } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/format';
import { Badge, Card, Empty, Notice, PageHeader, btnGold } from '@/components/ui';
import Timeline from '@/components/Timeline';
import EditClientForm from './EditClientForm';

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const client = await getClient(id);
  if (!client) notFound();

  const [cases, leads, timeline] = await Promise.all([clientCases(client.id), clientLeads(client.id), clientTimeline(client.id)]);

  return (
    <>
      <PageHeader
        title={client.full_name}
        subtitle={`Client since ${formatDate(client.created_at)}`}
        actions={
          <Link href={`/cases/new?client=${client.id}`} className={btnGold}>
            <Briefcase className="h-4 w-4" aria-hidden /> New case
          </Link>
        }
      />
      {(sp.case || sp.saved) && <div className="mb-6"><Notice tone="success">{sp.case ? 'Case opened.' : 'Saved.'}</Notice></div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title={`Cases (${cases.length})`}>
            {cases.length === 0 ? (
              <Empty>No cases yet.</Empty>
            ) : (
              <ul className="divide-y divide-gray-100 -my-2">
                {cases.map((c) => (
                  <li key={c.id} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={`/cases/${c.id}`} className="font-bold text-navy hover:text-gold">{label(SERVICES, c.service)}</Link>
                      <Badge kind={c.status}>{label(CASE_STATUSES, c.status)}</Badge>
                      <span className="text-xs text-gray-500">Opened {formatDateTime(c.opened_at)} by {c.opened_by_name}</span>
                    </div>
                    {c.notes && <p className="mt-1 text-gray-700 whitespace-pre-wrap">{c.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Timeline">
            <Timeline events={timeline} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Contact">
            <ul className="text-sm space-y-2.5">
              <li className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 text-gold shrink-0" aria-hidden />{client.email}</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold shrink-0" aria-hidden />{client.phone ?? '—'}</li>
            </ul>
            <details className="border-t border-gray-100 mt-4 pt-4">
              <summary className="cursor-pointer text-xs font-bold tracking-[0.12em] uppercase text-gold hover:text-navy list-none">Edit contact details</summary>
              <div className="mt-4">
                <EditClientForm clientId={client.id} client={{ name: client.full_name, email: client.email, phone: client.phone }} />
              </div>
            </details>
          </Card>
          <Card title="Original inquiries">
            {leads.length === 0 ? (
              <Empty>None linked.</Empty>
            ) : (
              <ul className="divide-y divide-gray-100 -my-2">
                {leads.map((l) => (
                  <li key={l.id} className="py-2.5 text-sm">
                    <Link href={`/leads/${l.id}`} className="font-bold text-navy hover:text-gold">
                      {label(SOURCES, l.source)} · {formatDate(l.created_at)}
                    </Link>
                    <div className="mt-1"><Badge kind={l.status}>{label(LEAD_STATUSES, l.status)}</Badge></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
