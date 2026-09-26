import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listToilets, PaginatedToilets } from '../api/toilets';
import ToiletQrCode from '../components/ToiletQrCode';

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
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Manage Toilets</h1>
        <Link
          to="/admin/toilets/new"
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Add New Toilet
        </Link>
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
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <>
          <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
            {result.data.map((toilet) => (
              <li key={toilet.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/toilets/${toilet.id}`} className="block">
                    <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                      {toilet.cleanConnectId ?? 'ID pending'}
                    </p>
                    <p className="font-medium text-slate-800">{toilet.location}</p>
                    <p className="text-sm text-slate-500">
                      {toilet.externalId ? `Source: ${toilet.externalId}` : 'No source ID (registered via CleanConnect)'}
                      {toilet.ward !== null ? ` · Ward ${toilet.ward}` : ''}
                    </p>
                  </Link>
                  {toilet.cleanConnectId && (
                    <button
                      type="button"
                      className="shrink-0 rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      onClick={() =>
                        setQrOpenFor(qrOpenFor === toilet.id ? null : toilet.id)
                      }
                    >
                      {qrOpenFor === toilet.id ? 'Hide QR' : 'View QR'}
                    </button>
                  )}
                </div>
                {qrOpenFor === toilet.id && toilet.cleanConnectId && (
                  <div className="mt-3">
                    <ToiletQrCode cleanConnectId={toilet.cleanConnectId} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {result.data.length === 0 && (
            <p className="mt-4 text-slate-500">No toilets match this search.</p>
          )}

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

export default AdminToilets;
