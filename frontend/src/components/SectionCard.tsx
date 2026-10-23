import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  // Unique per card on the page; the <section> is labelled by its heading.
  headingId: string;
  children: ReactNode;
}

// One consistent card shell for every section of the Toilet Details page
// (details, health score, reviews, report). Purely presentational.
function SectionCard({ title, headingId, children }: SectionCardProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <h2
        id={headingId}
        className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800"
      >
        {title}
      </h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default SectionCard;
