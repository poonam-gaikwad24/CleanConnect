import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from './icons';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  // Small label above the title, e.g. a complaint code.
  eyebrow?: string;
  // Primary actions for the page, shown on the right (wrap below on phones).
  actions?: ReactNode;
  back?: { to: string; label: string };
}

// The single page heading used everywhere: one h1 style, one place for the
// page's main action, one back-link style.
function PageHeader({ title, subtitle, eyebrow, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-brand-800 hover:underline"
        >
          <ArrowLeftIcon />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-mono text-xs uppercase tracking-wide text-slate-600">{eyebrow}</p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-prose text-sm text-slate-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
