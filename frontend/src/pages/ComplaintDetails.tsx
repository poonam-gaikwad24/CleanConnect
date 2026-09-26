import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Complaint, getComplaintById, updateComplaintStatus } from '../api/complaints';
import { useAuth } from '../context/AuthContext';
import { buildGoogleMapsSearchUrl } from '../utils/googleMapsLink';
import { ALL_STATUSES, categoryLabel, statusLabel } from '../utils/complaintLabels';

function ComplaintDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    getComplaintById(id)
      .then(setComplaint)
      .catch(() => setError('Complaint not found, or you do not have access to it.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(status: Complaint['status']) {
    if (!complaint) return;
    setUpdating(true);
    try {
      const updated = await updateComplaintStatus(complaint.id, status);
      setComplaint(updated);
    } catch {
      setError('Could not update status.');
    } finally {
      setUpdating(false);
    }
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link
        to={isAdmin ? '/admin/complaints' : '/my-complaints'}
        className="text-sm text-slate-500 hover:underline"
      >
        ← Back to list
      </Link>

      {loading && <p className="mt-4 text-slate-500">Loading…</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {complaint && (
        <div className="mt-4 rounded border border-slate-200 bg-white p-6">
          <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
            Complaint #{complaint.complaintCode}
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">
            {complaint.toilet.cleanConnectId ?? 'ID pending'} — {complaint.toilet.location}
          </h1>
          <a
            href={buildGoogleMapsSearchUrl(complaint.toilet.location)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            View on Google Maps
          </a>

          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Description</dt>
              <dd className="whitespace-pre-wrap text-slate-800">{complaint.description}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Category</dt>
              <dd className="text-slate-800">{categoryLabel(complaint.category)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Status</dt>
              <dd className="text-slate-800">{statusLabel(complaint.status)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Reported</dt>
              <dd className="text-slate-800">{new Date(complaint.createdAt).toLocaleString()}</dd>
            </div>
          </dl>

          {complaint.imageUrl && (
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-slate-500">Evidence photo</p>
              <img
                src={complaint.imageUrl}
                alt="Complaint evidence"
                className="max-h-80 rounded border border-slate-200 object-contain"
              />
            </div>
          )}

          {isAdmin && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="status">
                Update status
              </label>
              <select
                id="status"
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                value={complaint.status}
                disabled={updating}
                onChange={(e) => handleStatusChange(e.target.value as Complaint['status'])}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ComplaintDetails;
