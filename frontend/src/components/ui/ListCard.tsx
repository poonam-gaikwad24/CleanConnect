import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from './icons';

interface ListCardProps {
  to: string;
  // Small monospace label above the title (an ID or code).
  eyebrow?: string;
  title: string;
  // Secondary lines (location, dates …).
  meta?: ReactNode;
  // Status badges etc., shown under the text.
  badges?: ReactNode;
}

// A whole-card link for list pages. One focus style, one hover style, a
// chevron that signals it is clickable.
function ListCard({ to, eyebrow, title, meta, badges }: ListCardProps) {
  return (
    <Link
      to={to}
      className="card group block p-4 transition hover:border-brand-300 hover:shadow motion-reduce:transition-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="font-mono text-xs uppercase tracking-wide text-slate-600">{eyebrow}</p>}
          <p className="mt-0.5 break-words font-semibold text-slate-900 group-hover:text-brand-800">{title}</p>
          {meta && <div className="mt-1 space-y-0.5 text-sm text-slate-600">{meta}</div>}
        </div>
        <ChevronRightIcon className="mt-1 h-4 w-4 shrink-0 text-slate-500 group-hover:text-brand-700" />
      </div>
      {badges && <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>}
    </Link>
  );
}

export default ListCard;
