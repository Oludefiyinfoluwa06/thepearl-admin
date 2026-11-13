import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { dashboardStats, followUpsDue, listLeads } from '@/lib/leads';
import { LEAD_STATUSES, SOURCES, label } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/format';
import { Badge, Card, Empty, PageHeader } from '@/components/ui';

export default async function Dashboard() {
  const user = await requireUser();
  const [stats, due, allRecent] = await Promise.all([dashboardStats(), followUpsDue(), listLeads({})]);
  const recent = allRecent.slice(0, 8);

  const tiles = [
    { label: 'New inquiries', value: stats.newLeads, href: '/leads?status=new' },
    { label: 'Follow-ups due', value: stats.followUpsDue, href: '/leads?status=follow_up_later' },
    { label: 'Ready for a case', value: stats.awaitingCase, href: '/leads?status=moved_to_assessment' },
    { label: 'Open cases', value: stats.openCases, href: '/clients' },
  ];

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Here is where things stand today." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="bg-white border border-gray-200 border-t-2 border-t-gold rounded-sm p-4 hover:shadow-md transition-shadow">
            <p className="font-serif text-3xl font-bold text-navy">{t.value}</p>
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-gray-500 mt-1">{t.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Follow-ups due">
          {due.length === 0 ? (
            <Empty>Nobody is waiting on a follow-up.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100 -my-2">
              {due.map((l) => (
                <li key={l.id} className="py-2.5 flex justify-between gap-3 text-sm">
                  <Link href={`/leads/${l.id}`} className="font-semibold text-navy hover:text-gold">{l.name}</Link>
                  <span className="text-gray-500 text-right">{l.phone ?? ''} · due {formatDate(l.follow_up_on)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest inquiries" action={<Link href="/leads" className="text-xs font-bold uppercase tracking-widest text-gold hover:text-navy">View all</Link>}>
          {recent.length === 0 ? (
            <Empty>No inquiries yet. Log the first one with “New inquiry”.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100 -my-2">
              {recent.map((l) => (
                <li key={l.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/leads/${l.id}`} className="font-semibold text-navy hover:text-gold">{l.name}</Link>
                    <p className="text-xs text-gray-500">{label(SOURCES, l.source)} · {formatDateTime(l.created_at)}</p>
                  </div>
                  <Badge kind={l.status}>{label(LEAD_STATUSES, l.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
