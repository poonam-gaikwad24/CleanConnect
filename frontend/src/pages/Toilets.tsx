import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listToilets, PaginatedToilets } from '../api/toilets';
import { buildGoogleMapsSearchUrl } from '../utils/googleMapsLink';
import { useAuth } from '../context/AuthContext';

function Toilets() {
  const { user } = useAuth();
  const [result, setResult] = useState<PaginatedToilets | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);

    listToilets({ page, limit: 20, search: search.trim() || undefined })
      .then(setResult)
      .catch(() => setError('Could not load toilets. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Public Toilets</h1>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by CleanConnect ID, address, or area…"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        {user && (
          <p className="mt-2 text-sm text-slate-500">
            Toilet not listed?{' '}
            <Link to="/toilet-requests/create" className="text-blue-600 hover:underline">
              Request registration
            </Link>
          </p>
        )}
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <>
          <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
            {result.data.map((toilet) => (
              <li key={toilet.id} className="p-4 hover:bg-slate-50">
                <Link to={`/toilets/${toilet.id}`} className="block">
                  <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                    {toilet.cleanConnectId ?? 'ID pending'}
                  </p>
                  <p className="font-medium text-slate-800">{toilet.location}</p>
                  <p className="text-sm text-slate-500">
                    {toilet.type ?? 'Type unknown'}
                    {toilet.ward !== null ? ` · Ward ${toilet.ward}` : ''}
                  </p>
                </Link>
                <div className="mt-2 flex gap-4">
                  <a
                    href={buildGoogleMapsSearchUrl(toilet.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block text-sm font-medium text-blue-600 hover:underline"
                  >
                    View on Google Maps
                  </a>
                  {user && (
                    <Link
                      to={`/complaints/create?toilet=${toilet.cleanConnectId ?? toilet.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block text-sm font-medium text-slate-600 hover:underline"
                    >
                      Report an issue
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <button
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {result.page} of {result.totalPages} ({result.total} total)
            </span>
            <button
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
              disabled={page >= result.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Toilets;
