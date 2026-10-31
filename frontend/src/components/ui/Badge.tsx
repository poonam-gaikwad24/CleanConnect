import type { ReactNode } from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Full class names (not built dynamically) so Tailwind keeps them.
const STYLE: Record<BadgeTone, string> = {
  success: 'border-green-300 bg-green-100 text-green-900',
  warning: 'border-amber-300 bg-amber-100 text-amber-900',
  danger: 'border-red-300 bg-red-100 text-red-900',
  info: 'border-blue-300 bg-blue-100 text-blue-900',
  neutral: 'border-slate-300 bg-slate-100 text-slate-800',
};

// A status pill. Always pair it with text (and ideally an icon) — colour is a
// second cue, never the only one.
function Badge({ tone = 'neutral', icon, children }: { tone?: BadgeTone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLE[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

export default Badge;
