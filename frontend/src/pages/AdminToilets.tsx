import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listToilets, PaginatedToilets } from '../api/toilets';
import ToiletQrCode from '../components/ToiletQrCode';
import Alert from '../components/ui/Alert';
import { PlusIcon, SearchIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';
import { EmptyState, LoadingState } from '../components/ui/States';

function AdminToilets() {
  const [result, setResult] = useState<PaginatedToilets | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrOpenFor, setQrOpenFor] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    listToilets({ page, limit: 20, search: search.trim() || undefined })
      .then(setResult)
      .catch(() => setError('Could not load toilets.'))
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <PageContainer>
      <PageHeader
        title="Manage Toilets"
        subtitle="The toilet directory. Open a toilet to see its details, or view its QR code."
        actions={
          <Link to="/admin/toilets/new" className="btn btn-primary">
            <PlusIcon />
            Add New Toilet
          </Link>
        }
      />

      <div className="mb-6">
        <label htmlFor="admin-toilet-search" className="sr-only">
          Search toilets
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="admin-toilet-search"
            type="text"
            placeholder="Search by CleanConnect ID, address, or area…"
            className="field pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {loading && <LoadingState label="Loading toilets…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {result && (
        <>
          {result.data.length === 0 ? (
            <EmptyState
              icon={<SearchIcon className="h-5 w-5" />}
              title="No toilets match this search."
              description="Try a different search term."
            />
          ) : (
            <ul className="grid gap-3">
              {result.data.map((toilet) => (
                <li key={toilet.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <Link to={`/toilets/${toilet.id}`} className="group block min-w-0">
                      <p className="font-mono text-xs uppercase tracking-wide text-slate-600">
                        {toilet.cleanConnectId ?? 'ID pending'}
                      </p>
                      <p className="mt-0.5 break-words font-semibold text-slate-900 group-hover:text-brand-800">
                        {toilet.location}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {toilet.externalId ? `Source: ${toilet.externalId}` : 'No source ID (registered via CleanConnect)'}
                        {toilet.ward !== null ? ` · Ward ${toilet.ward}` : ''}
                      </p>
                    </Link>
                    {toilet.cleanConnectId && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm shrink-0"
                        aria-expanded={qrOpenFor === toilet.id}
                        onClick={() => setQrOpenFor(qrOpenFor === toilet.id ? null : toilet.id)}
                      >
                        {qrOpenFor === toilet.id ? 'Hide QR' : 'View QR'}
                      </button>
                    )}
                  </div>
                  {qrOpenFor === toilet.id && toilet.cleanConnectId && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <ToiletQrCode cleanConnectId={toilet.cleanConnectId} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            onPrevious={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </PageContainer>
  );
}

export default AdminToilets;
