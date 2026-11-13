import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { listActiveUsers } from '@/lib/users';
import { getLead, leadTimeline, listConsultations } from '@/lib/leads';
import { LEAD_STATUSES, OUTCOMES, SERVICES, SOURCES, label } from '@/lib/constants';
import { formatDate, formatDateTime, nowForInput } from '@/lib/format';
import { Badge, Card, Empty, Notice, PageHeader, btnGold } from '@/components/ui';
import Timeline from '@/components/Timeline';
import { AddConsultationForm, EditContactForm } from './LeadForms';

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const lead = await getLead(id);
  if (!lead) notFound();

  const [consultations, timeline, users] = await Promise.all([listConsultations(lead.id), leadTimeline(lead.id), listActiveUsers()]);
  const ready = lead.status === 'moved_to_assessment';

  return (
    <>
      <PageHeader
        title={lead.name}
        subtitle={
          <>
            <Badge kind={lead.status}>{label(LEAD_STATUSES, lead.status)}</Badge>{' '}
            <span className="ml-1">Logged {formatDateTime(lead.created_at)}{lead.created_by_name ? ` by ${lead.created_by_name}` : ' from the website form'}</span>
          </>
        }
        actions={
          <Link href={`/cases/new?lead=${lead.id}`} className={btnGold}>
            <Briefcase className="h-4 w-4" aria-hidden /> {lead.client_id ? 'Open another case' : 'Open case'}
          </Link>
        }
      />

      <div className="space-y-4 mb-6">
        {sp.created && <Notice tone="success">Inquiry saved. You can find it again any time under Inquiries.</Notice>}
        {sp.saved && <Notice tone="success">Saved.</Notice>}
        {ready && !lead.client_id && (
          <Notice tone="warn">
            Moved to assessment — next step is to <Link className="font-bold underline" href={`/cases/new?lead=${lead.id}`}>open a case</Link>.
            {!lead.email && ' A valid email will be requested there.'}
          </Notice>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Consultations">
            {consultations.length === 0 ? (
              <Empty>No consultation yet.</Empty>
            ) : (
              <ul className="divide-y divide-gray-100 -mt-2 mb-6">
                {consultations.map((c) => (
                  <li key={c.id} className="py-3.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-bold text-navy text-sm">{formatDateTime(c.held_at)}</span>
                      <Badge kind={c.outcome}>{label(OUTCOMES, c.outcome)}</Badge>
                      <span className="text-xs text-gray-500">handled by {c.handled_by_name}</span>
                    </div>
                    {c.notes && <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-wrap">{c.notes}</p>}
                    {c.follow_up_on && <p className="mt-1 text-xs font-semibold text-amber-700">Follow up on {formatDate(c.follow_up_on)}</p>}
                  </li>
                ))}
              </ul>
            )}
            <details open={consultations.length === 0} className="group border-t border-gray-100 pt-4">
              <summary className="cursor-pointer text-xs font-bold tracking-[0.12em] uppercase text-gold hover:text-navy mb-4 list-none">
                + Add a consultation
              </summary>
              <AddConsultationForm leadId={lead.id} users={users} defaultHeldAt={nowForInput()} currentUserId={user.id} />
            </details>
          </Card>

          <Card title="Timeline">
            <Timeline events={timeline} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Inquiry">
            <dl className="text-sm space-y-3">
              <Row term="Phone / WhatsApp" value={lead.phone} />
              <Row term="Email" value={lead.email ?? 'None yet — needed before a case'} muted={!lead.email} />
              <Row term="Source" value={label(SOURCES, lead.source)} />
              <Row term="Interested in" value={lead.service ? label(SERVICES, lead.service) : null} />
              <Row term="They said" value={lead.message} />
              {lead.client_id && (
                <div>
                  <dt className="text-xs font-bold tracking-[0.12em] uppercase text-gray-500">Client profile</dt>
                  <dd><Link href={`/clients/${lead.client_id}`} className="font-bold text-navy hover:text-gold">View client →</Link></dd>
                </div>
              )}
            </dl>
            <details className="border-t border-gray-100 mt-4 pt-4">
              <summary className="cursor-pointer text-xs font-bold tracking-[0.12em] uppercase text-gold hover:text-navy list-none">Edit contact details</summary>
              <div className="mt-4">
                <EditContactForm leadId={lead.id} lead={lead} emailRequired={Boolean(lead.client_id)} />
              </div>
            </details>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ term, value, muted }: { term: string; value: string | null; muted?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-[0.12em] uppercase text-gray-500">{term}</dt>
      <dd className={`whitespace-pre-wrap break-words ${muted ? 'text-amber-700' : 'text-gray-800'}`}>{value || '—'}</dd>
    </div>
  );
}
