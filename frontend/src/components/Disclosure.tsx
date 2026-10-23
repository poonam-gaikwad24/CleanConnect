import type { ReactNode } from 'react';

interface DisclosureProps {
  title: string;
  children: ReactNode;
}

// A collapsed-by-default expandable section built on the native
// <details>/<summary> elements, so keyboard operation (Tab, Enter, Space)
// and the open/closed announcement for screen readers come from the
// browser, with no JavaScript to get wrong. The state is also shown
// visually in two non-colour ways: the chevron flips and the text
// switches between "Show" and "Hide". Motion is removed for users who
// prefer reduced motion.
function Disclosure({ title, children }: DisclosureProps) {
  return (
    <details className="group mt-3 rounded-md border border-slate-200">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-normal text-slate-600">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          >
            <path
              d="M5 7.5l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>
      <div className="border-t border-slate-200 px-3 py-3 text-sm text-slate-700">{children}</div>
    </details>
  );
}

export default Disclosure;
