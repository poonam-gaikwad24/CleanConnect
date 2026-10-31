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
import { RequestStatusBadge } from '../components/StatusBadges';
import Alert from '../components/ui/Alert';
import Field from '../components/ui/Field';
import { ArrowLeftIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import { LoadingState } from '../components/ui/States';

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
    <PageContainer>
      {loading && <LoadingState label="Loading request…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {!request && !loading && (
        <Link
          to={isAdmin ? '/admin/toilet-requests' : '/my-toilet-requests'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-brand-800 hover:underline"
        >
          <ArrowLeftIcon />
          Back to list
        </Link>
      )}

      {request && (
        <>
          <PageHeader
            back={{ to: isAdmin ? '/admin/toilet-requests' : '/my-toilet-requests', label: 'Back to list' }}
            eyebrow={`Request #${request.requestCode}`}
            title={request.location}
            actions={<RequestStatusBadge status={request.status} />}
          />

          <div className={`grid gap-6 ${isAdmin && request.status === 'PENDING' ? 'lg:grid-cols-3' : ''}`}>
            <div className={`space-y-6 ${isAdmin && request.status === 'PENDING' ? 'lg:col-span-2' : ''}`}>
              <section aria-labelledby="request-heading" className="card p-5">
                <h2 id="request-heading" className="mb-4 text-base font-semibold text-slate-900">
                  Request details
                </h2>
                <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Landmark</dt>
                    <dd className="mt-1 text-slate-900">{request.landmark ?? 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Address</dt>
                    <dd className="mt-1 text-slate-900">{request.address ?? 'Not provided'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Description</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-900">
                      {request.description ?? 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Status</dt>
                    <dd className="mt-1">
                      <RequestStatusBadge status={request.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Submitted</dt>
                    <dd className="mt-1 text-slate-900">{new Date(request.createdAt).toLocaleString()}</dd>
                  </div>
                  {request.adminNotes && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Admin notes</dt>
                      <dd className="mt-1 text-slate-900">{request.adminNotes}</dd>
                    </div>
                  )}
                </dl>

                {request.imageUrl && (
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                      Evidence photo
                    </p>
                    <img
                      src={request.imageUrl}
                      alt="Toilet request evidence"
                      className="max-h-80 max-w-full rounded-md border border-slate-200 object-contain"
                    />
                  </div>
                )}
              </section>

              {request.status === 'APPROVED' && request.resultingToilet && (
                <section aria-labelledby="registered-heading" className="card p-5">
                  <h2 id="registered-heading" className="mb-3 text-base font-semibold text-slate-900">
                    Registered as {request.resultingToilet.cleanConnectId}
                  </h2>
                  <div className="flex flex-wrap items-center gap-5">
                    {request.resultingToilet.cleanConnectId && (
                      <ToiletQrCode cleanConnectId={request.resultingToilet.cleanConnectId} size={140} />
                    )}
                    <Link to={`/toilets/${request.resultingToilet.id}`} className="btn btn-secondary">
                      View toilet page →
                    </Link>
                  </div>
                </section>
              )}
            </div>

            {isAdmin && request.status === 'PENDING' && (
              <section aria-labelledby="review-heading" className="card h-fit p-5">
                <h2 id="review-heading" className="mb-3 text-base font-semibold text-slate-900">
                  Review request
                </h2>

                {possibleDuplicates.length > 0 && (
                  <Alert tone="warning" className="mb-4">
                    <p className="mb-2 font-medium">
                      Possible existing matches for "{request.location}" — check before approving:
                    </p>
                    <ul className="space-y-1">
                      {possibleDuplicates.map((toilet) => (
                        <li key={toilet.id}>
                          <Link
                            to={`/toilets/${toilet.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link"
                          >
                            {toilet.cleanConnectId ?? 'ID pending'} — {toilet.location}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <Field label="Admin notes (optional)">
                  <textarea
                    id="adminNotes"
                    rows={3}
                    className="field"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </Field>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={handleApprove} disabled={reviewing} className="btn btn-primary">
                    Approve
                  </button>
                  <button onClick={handleReject} disabled={reviewing} className="btn btn-danger">
                    Reject
                  </button>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}

export default ToiletRequestDetails;
