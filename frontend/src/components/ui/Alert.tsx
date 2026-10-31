import type { ReactNode } from 'react';
import { AlertTriangleIcon, CheckCircleIcon, InfoCircleIcon, XCircleIcon } from './icons';

export type AlertTone = 'error' | 'warning' | 'success' | 'info';

const STYLE: Record<AlertTone, string> = {
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  success: 'border-green-200 bg-green-50 text-green-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

const ICON: Record<AlertTone, () => JSX.Element> = {
  error: () => <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />,
  warning: () => <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />,
  success: () => <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />,
  info: () => <InfoCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />,
};

// Errors are announced immediately (role="alert"); everything else politely
// (role="status"). The icon + the text make the tone clear without colour.
function Alert({
  tone = 'info',
  children,
  className = '',
}: {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${STYLE[tone]} ${className}`}
    >
      {ICON[tone]()}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default Alert;
