import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  listComplaints,
  PaginatedComplaints,
} from '../api/complaints';
import { ALL_CATEGORIES, ALL_STATUSES, categoryLabel, statusLabel } from '../utils/complaintLabels';

function AdminComplaints() {
  const [result, setResult] = useState<PaginatedComplaints | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ComplaintStatus | ''>('');
  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);

    listComplaints({
      page,
      limit: 20,
      status: status || undefined,
      category: category || undefined,
    })
      .then(setResult)
      .catch(() => setError('Could not load complaints.'))
      .finally(() => setLoading(false));
  }, [page, status, category]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-800">Complaints (Admin)</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ComplaintStatus | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>

        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as ComplaintCategory | '');
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <>
          <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
            {result.data.map((complaint: Complaint) => (
              <li key={complaint.id} className="p-4 hover:bg-slate-50">
                <Link to={`/complaints/${complaint.id}`} className="block">
                  <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                    Complaint #{complaint.complaintCode}
                  </p>
                  <p className="font-medium text-slate-800">
                    {complaint.toilet.cleanConnectId ?? 'ID pending'} — {complaint.toilet.location}
                  </p>
                  <p className="text-sm text-slate-500">{complaint.description}</p>
                  <p className="text-sm text-slate-500">
                    Category: {categoryLabel(complaint.category)} · Status:{' '}
                    {statusLabel(complaint.status)}
                    {complaint.imageUrl ? ' · Has photo evidence' : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {result.data.length === 0 && (
            <p className="mt-4 text-slate-500">No complaints match these filters.</p>
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

export default AdminComplaints;
