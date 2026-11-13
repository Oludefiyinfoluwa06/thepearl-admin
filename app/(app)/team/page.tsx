import { requireOwner } from '@/lib/auth';
import { listMembers } from '@/lib/users';
import { setUserActiveAction } from '@/app/actions/team';
import { formatDate } from '@/lib/format';
import { Badge, Card, PageHeader, btnGhost } from '@/components/ui';
import TeamForm from './TeamForm';
import ResendInvite from './ResendInvite';

export const metadata = { title: 'Team — The Pearl Admin' };

export default async function TeamPage() {
  const me = await requireOwner();
  const members = await listMembers();

  return (
    <>
      <PageHeader title="Team" subtitle="Owners manage the team; staff handle inquiries, clients and cases." />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <ul className="divide-y divide-gray-100 -my-3">
              {members.map((m) => (
                <li key={m.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    <p className={`font-bold ${m.active ? 'text-navy' : 'text-gray-400 line-through'}`}>{m.name}</p>
                    <p className="text-xs text-gray-500">{m.email} · added {formatDate(m.created_at)}</p>
                    {m.invited && m.active && <p className="text-xs font-semibold text-amber-700">Invitation pending — no password set yet</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge kind={m.role === 'owner' ? 'moved_to_assessment' : 'new'}>{m.role === 'owner' ? 'Owner' : 'Staff'}</Badge>
                    {m.invited && m.active && <ResendInvite userId={m.id} />}
                    {m.id !== me.id && (
                      <form action={setUserActiveAction.bind(null, m.id, !m.active)}>
                        <button className={`${btnGhost} py-1.5!`}>{m.active ? 'Deactivate' : 'Reactivate'}</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card title="Invite a team member">
          <TeamForm />
        </Card>
      </div>
    </>
  );
}
