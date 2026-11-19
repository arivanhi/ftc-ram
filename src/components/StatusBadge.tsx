import {
  AVAILABILITY_META,
  CONDITION_META,
  CONTACT_STATUS_META,
  LOAN_STATUS_META,
  URGENCY_META,
  type AssetAvailability,
  type AssetCondition,
  type ContactStatus,
  type IssueUrgency,
  type LoanStatus,
} from '@/lib/format';

export function ConditionBadge({ condition }: { condition: string }) {
  const m = CONDITION_META[condition as AssetCondition] ?? CONDITION_META.prima;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm ${m.bgClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dotClass}`} />
      {m.label}
    </span>
  );
}

export function AvailabilityBadge({ availability }: { availability: string }) {
  const m = AVAILABILITY_META[availability as AssetAvailability] ?? AVAILABILITY_META.tersedia;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm ${m.bgClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dotClass}`} />
      {m.label}
    </span>
  );
}

export function LoanStatusBadge({ status }: { status: string }) {
  const m = LOAN_STATUS_META[status as LoanStatus] ?? LOAN_STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm ${m.bgClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dotClass}`} />
      {m.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const m = URGENCY_META[urgency as IssueUrgency] ?? URGENCY_META.sedang;
  return <span className={`px-2 py-0.5 rounded-full text-label-sm ${m.bgClass}`}>{m.label}</span>;
}

export function ContactStatusBadge({ status }: { status: string }) {
  const m = CONTACT_STATUS_META[status as ContactStatus] ?? CONTACT_STATUS_META.available;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm ${m.bgClass}`}>
      <span className={`w-2 h-2 rounded-full ${m.dotClass}`} />
      {m.label}
    </span>
  );
}
