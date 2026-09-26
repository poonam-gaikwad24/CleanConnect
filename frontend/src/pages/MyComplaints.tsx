import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Complaint, listMyComplaints } from '../api/complaints';
import { categoryLabel, statusLabel } from '../utils/complaintLabels';

function MyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyComplaints()
      .then(setComplaints)
      .catch(() => setError('Could not load your complaints.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">My Complaints</h1>
        <Link
          to="/complaints/create"
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Report an Issue
        </Link>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {complaints && complaints.length === 0 && (
        <p className="text-slate-500">You haven't reported any issues yet.</p>
      )}

      {complaints && complaints.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {complaints.map((complaint) => (
            <li key={complaint.id} className="p-4 hover:bg-slate-50">
              <Link to={`/complaints/${complaint.id}`} className="block">
                <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                  Complaint #{complaint.complaintCode}
                </p>
                <p className="font-medium text-slate-800">
                  Toilet: {complaint.toilet.cleanConnectId ?? 'ID pending'} — {complaint.toilet.location}
                </p>
                <p className="text-sm text-slate-500">
                  Category: {categoryLabel(complaint.category)} · Status: {statusLabel(complaint.status)}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(complaint.createdAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyComplaints;
