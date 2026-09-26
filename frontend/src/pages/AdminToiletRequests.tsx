import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listToiletRequests,
  PaginatedToiletRequests,
  RequestStatus,
} from '../api/toiletRequests';
import { ALL_REQUEST_STATUSES, requestStatusLabel } from '../utils/requestLabels';

function AdminToiletRequests() {
  const [result, setResult] = useState<PaginatedToiletRequests | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<RequestStatus | ''>('PENDING');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);

    listToiletRequests({ page, limit: 20, status: status || undefined })
      .then(setResult)
      .catch(() => setError('Could not load registration requests.'))
      .finally(() => setLoading(false));
  }, [page, status]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-800">Toilet Registration Requests</h1>

      <div className="mb-4">
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as RequestStatus | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {ALL_REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {requestStatusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <>
          <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
            {result.data.map((request) => (
              <li key={request.id} className="p-4 hover:bg-slate-50">
                <Link to={`/toilet-requests/${request.id}`} className="block">
                  <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                    Request #{request.requestCode}
                  </p>
                  <p className="font-medium text-slate-800">{request.location}</p>
                  <p className="text-sm text-slate-500">{request.landmark ?? 'No landmark given'}</p>
                  <p className="text-sm text-slate-500">
                    Status: {requestStatusLabel(request.status)}
                    {request.imageUrl ? ' · Has photo evidence' : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {result.data.length === 0 && (
            <p className="mt-4 text-slate-500">No requests match this filter.</p>
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

export default AdminToiletRequests;
