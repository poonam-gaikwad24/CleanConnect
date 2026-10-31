import type { ReactNode } from 'react';

// Shared loading and empty states, so every list/detail page reports "still
// loading" and "nothing here yet" the same way.

export function LoadingState({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-3 py-8 text-sm text-slate-700 ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 animate-spin text-brand-700 motion-reduce:animate-none"
        fill="none"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">{icon}</div>}
      <p className="font-semibold text-slate-900">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
