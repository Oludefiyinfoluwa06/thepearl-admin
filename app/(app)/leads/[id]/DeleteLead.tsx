'use client';

import { deleteLeadAction } from '@/app/actions/leads';
import { btnGhost } from '@/components/ui';

export default function DeleteLead({ leadId, name }: { leadId: string; name: string }) {
  return (
    <form
      action={deleteLeadAction.bind(null, leadId)}
      onSubmit={(e) => {
        if (!confirm(`Delete the inquiry from ${name}? Its consultations and history are removed too. This cannot be undone.`)) e.preventDefault();
      }}
    >
      <button className={`${btnGhost} text-red-700! border-red-200! hover:border-red-600!`}>Delete inquiry</button>
    </form>
  );
}
