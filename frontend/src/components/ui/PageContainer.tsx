import type { ReactNode } from 'react';

// One set of page widths for the whole app (previously five different
// ad-hoc max-w-* values). auth: sign-in/up · narrow: forms ·
// default: lists and details · wide: wide admin/analytics screens.
export type PageSize = 'auth' | 'narrow' | 'default' | 'wide';

const SIZE: Record<PageSize, string> = {
  auth: 'max-w-md',
  narrow: 'max-w-2xl',
  default: 'max-w-5xl',
  wide: 'max-w-6xl',
};

function PageContainer({
  size = 'default',
  children,
  className = '',
}: {
  size?: PageSize;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full px-4 py-8 sm:px-6 ${SIZE[size]} ${className}`}>{children}</div>
  );
}

export default PageContainer;
