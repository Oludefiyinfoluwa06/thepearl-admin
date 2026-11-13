import { formatDateTime } from '@/lib/format';
import type { TimelineEvent } from '@/lib/leads';
import { Empty } from './ui';

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <Empty>Nothing has happened yet.</Empty>;
  return (
    <ol className="relative border-l-2 border-gold/40 ml-2 space-y-5">
      {events.map((e) => (
        <li key={e.id} className="pl-5 relative">
          <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-gold border-2 border-white" />
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{e.summary}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDateTime(e.created_at)}
            {e.actor_name ? ` · ${e.actor_name}` : ' · via website'}
          </p>
        </li>
      ))}
    </ol>
  );
}
