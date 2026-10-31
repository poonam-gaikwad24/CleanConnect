import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listToilets, PaginatedToilets } from '../api/toilets';
import { getToiletHealthSummaries, ToiletHealthSummary } from '../api/toiletHealth';
import { ToiletHealthBadge } from '../components/ToiletHealthView';
import { buildGoogleMapsSearchUrl } from '../utils/googleMapsLink';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/ui/Alert';
import { ExternalLinkIcon, SearchIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';
import { EmptyState, LoadingState } from '../components/ui/States';

function Toilets() {
  const { user } = useAuth();
  const [result, setResult] = useState<PaginatedToilets | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Module 9: health summaries for the toilets on the current page,
  // fetched in ONE request after the list loads. A failure here never
  // blocks the list itself — rows just show "unavailable".
  const [healthMap, setHealthMap] = useState<Record<string, ToiletHealthSummary>>({});
  const [healthState, setHealthState] = useState<'loading' | 'error' | 'ready'>('loading');

  useEffect(() => {
    setLoading(true);
    setError(null);

    listToilets({ page, limit: 20, search: search.trim() || undefined })
      .then(setResult)
      .catch(() => setError('Could not load toilets. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    setHealthState('loading');

    getToiletHealthSummaries(result.data.map((t) => t.id))
      .then((map) => {
        if (cancelled) return;
        setHealthMap(map);
        setHealthState('ready');
      })
      .catch(() => {
        if (!cancelled) setHealthState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [result]);

  return (
    <PageContainer>
      <PageHeader
        title="Public Toilets"
        subtitle="Search the directory, check a toilet's estimated condition, and report problems."
      />

      <div className="mb-6">
        <label htmlFor="toilet-search" className="sr-only">
          Search toilets
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="toilet-search"
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
        {user?.role === 'CITIZEN' && (
          <p className="mt-2 text-sm text-slate-700">
            Toilet not listed?{' '}
            <Link to="/toilet-requests/create" className="link">
              Request registration
            </Link>
          </p>
        )}
      </div>

      {loading && <LoadingState label="Loading toilets…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {result && result.data.length === 0 && !loading && (
        <EmptyState
          icon={<SearchIcon className="h-5 w-5" />}
          title="No toilets found"
          description="Try a different search term, or clear the search box to see every toilet."
        />
      )}

      {result && result.data.length > 0 && (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {result.data.map((toilet) => (
              <li key={toilet.id} className="card flex flex-col">
                <Link
                  to={`/toilets/${toilet.id}`}
                  className="group block flex-1 rounded-t-lg p-4 hover:bg-slate-50"
                >
                  <p className="font-mono text-xs uppercase tracking-wide text-slate-600">
                    {toilet.cleanConnectId ?? 'ID pending'}
                  </p>
                  <p className="mt-0.5 break-words font-semibold text-slate-900 group-hover:text-brand-800">
                    {toilet.location}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {toilet.type ?? 'Type unknown'}
                    {toilet.ward !== null ? ` · Ward ${toilet.ward}` : ''}
                  </p>
                  <p className="mt-3">
                    {healthState === 'ready' && healthMap[toilet.id] ? (
                      <ToiletHealthBadge state="ready" summary={healthMap[toilet.id]} />
                    ) : (
                      <ToiletHealthBadge state={healthState === 'ready' ? 'error' : healthState} />
                    )}
                  </p>
                </Link>
                <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 px-4 py-3 text-sm">
                  <a
                    href={buildGoogleMapsSearchUrl(toilet.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="link inline-flex items-center gap-1 no-underline hover:underline"
                  >
                    View on Google Maps
                    <ExternalLinkIcon />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  {user?.role === 'CITIZEN' && (
                    <Link
                      to={`/complaints/create?toilet=${toilet.cleanConnectId ?? toilet.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="link no-underline hover:underline"
                    >
                      Report an issue
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>

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

export default Toilets;
