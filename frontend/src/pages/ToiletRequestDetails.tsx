import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  approveToiletRequest,
  getToiletRequestById,
  rejectToiletRequest,
  ToiletRequest,
} from '../api/toiletRequests';
import { listToilets, Toilet } from '../api/toilets';
import { useAuth } from '../context/AuthContext';
import ToiletQrCode from '../components/ToiletQrCode';
import { requestStatusLabel } from '../utils/requestLabels';

function ToiletRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<ToiletRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [possibleDuplicates, setPossibleDuplicates] = useState<Toilet[]>([]);

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(null);

    getToiletRequestById(id)
      .then(setRequest)
      .catch(() => setError('Request not found, or you do not have access to it.'))
      .finally(() => setLoading(false));
  }

  // Lightweight duplicate check: reuses the existing toilet search
  // (GET /api/toilets?search=) rather than any geospatial matching —
  // just enough for an admin to eyeball obvious duplicates by area
  // name before approving. Only runs for admins reviewing a still-open
  // request.
  useEffect(() => {
    if (!request || request.status !== 'PENDING' || user?.role !== 'ADMIN') {
      setPossibleDuplicates([]);
      return;
    }

    listToilets({ search: request.location, limit: 5 })
      .then((res) => setPossibleDuplicates(res.data))
      .catch(() => setPossibleDuplicates([]));
  }, [request, user]);

  async function handleApprove() {
    if (!request) return;
    setReviewing(true);
    try {
      const updated = await approveToiletRequest(request.id, adminNotes || undefined);
      setRequest(updated);
    } catch {
      setError('Could not approve this request.');
    } finally {
      setReviewing(false);
    }
  }

  async function handleReject() {
    if (!request) return;
    setReviewing(true);
    try {
      const updated = await rejectToiletRequest(request.id, adminNotes || undefined);
      setRequest(updated);
    } catch {
      setError('Could not reject this request.');
    } finally {
      setReviewing(false);
    }
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link
        to={isAdmin ? '/admin/toilet-requests' : '/my-toilet-requests'}
        className="text-sm text-slate-500 hover:underline"
      >
        ← Back to list
      </Link>

      {loading && <p className="mt-4 text-slate-500">Loading…</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {request && (
        <div className="mt-4 rounded border border-slate-200 bg-white p-6">
          <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
            Request #{request.requestCode}
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">{request.location}</h1>

          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Landmark</dt>
              <dd className="text-slate-800">{request.landmark ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Address</dt>
              <dd className="text-slate-800">{request.address ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Description</dt>
              <dd className="whitespace-pre-wrap text-slate-800">
                {request.description ?? 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Status</dt>
              <dd className="text-slate-800">{requestStatusLabel(request.status)}</dd>
            </div>
            {request.adminNotes && (
              <div>
                <dt className="font-medium text-slate-500">Admin notes</dt>
                <dd className="text-slate-800">{request.adminNotes}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-slate-500">Submitted</dt>
              <dd className="text-slate-800">{new Date(request.createdAt).toLocaleString()}</dd>
            </div>
          </dl>

          {request.imageUrl && (
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-slate-500">Evidence photo</p>
              <img
                src={request.imageUrl}
                alt="Toilet request evidence"
                className="max-h-80 rounded border border-slate-200 object-contain"
              />
            </div>
          )}

          {request.status === 'APPROVED' && request.resultingToilet && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-500">
                Registered as {request.resultingToilet.cleanConnectId}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {request.resultingToilet.cleanConnectId && (
                  <ToiletQrCode cleanConnectId={request.resultingToilet.cleanConnectId} size={140} />
                )}
                <Link
                  to={`/toilets/${request.resultingToilet.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View toilet page →
                </Link>
              </div>
            </div>
          )}

          {isAdmin && request.status === 'PENDING' && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              {possibleDuplicates.length > 0 && (
                <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-sm font-medium text-amber-800">
                    Possible existing matches for "{request.location}" — check before approving:
                  </p>
                  <ul className="space-y-1">
                    {possibleDuplicates.map((toilet) => (
                      <li key={toilet.id}>
                        <Link
                          to={`/toilets/${toilet.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-700 hover:underline"
                        >
                          {toilet.cleanConnectId ?? 'ID pending'} — {toilet.location}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="adminNotes">
                Admin notes (optional)
              </label>
              <textarea
                id="adminNotes"
                rows={2}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={reviewing}
                  className="rounded bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={reviewing}
                  className="rounded bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToiletRequestDetails;
