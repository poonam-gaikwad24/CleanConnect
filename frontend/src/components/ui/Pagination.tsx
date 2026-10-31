interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onPrevious: () => void;
  onNext: () => void;
}

// "Previous / Next" with the page summary between them. Disabled buttons are
// real disabled buttons, so they are skipped by keyboard and announced.
function Pagination({ page, totalPages, total, onPrevious, onNext }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={onPrevious} disabled={page <= 1} className="btn btn-secondary btn-sm">
        Previous
      </button>
      <p className="text-sm text-slate-700" aria-live="polite">
        Page {page} of {totalPages}
        {total !== undefined ? ` (${total} total)` : ''}
      </p>
      <button type="button" onClick={onNext} disabled={page >= totalPages} className="btn btn-secondary btn-sm">
        Next
      </button>
    </nav>
  );
}

export default Pagination;
