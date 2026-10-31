import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listToiletRequests,
  PaginatedToiletRequests,
  RequestStatus,
} from '../api/toiletRequests';
import { ALL_REQUEST_STATUSES, requestStatusLabel } from '../utils/requestLabels';
import { RequestStatusBadge } from '../components/StatusBadges';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import { PinIcon } from '../components/ui/icons';
import ListCard from '../components/ui/ListCard';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';
import { EmptyState, LoadingState } from '../components/ui/States';

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
    <PageContainer>
      <PageHeader
        title="Toilet Registration Requests"
        subtitle="Citizen requests to add a toilet that is missing from the directory."
      />

      <div className="card mb-6 p-4">
        <label htmlFor="filter-request-status" className="label">
          Status
        </label>
        <select
          id="filter-request-status"
          className="field sm:w-60"
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

      {loading && <LoadingState label="Loading requests…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {result && (
        <>
          {result.data.length === 0 ? (
            <EmptyState
              icon={<PinIcon className="h-5 w-5" />}
              title="No requests match this filter."
              description="Try a different status."
            />
          ) : (
            <ul className="grid gap-3">
              {result.data.map((request) => (
                <li key={request.id}>
                  <ListCard
                    to={`/toilet-requests/${request.id}`}
                    eyebrow={`Request #${request.requestCode}`}
                    title={request.location}
                    meta={
                      <>
                        <p>{request.landmark ?? 'No landmark given'}</p>
                        <p>Requested {new Date(request.createdAt).toLocaleDateString()}</p>
                      </>
                    }
                    badges={
                      <>
                        <RequestStatusBadge status={request.status} />
                        {request.imageUrl && <Badge tone="neutral">Photo attached</Badge>}
                      </>
                    }
                  />
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

export default AdminToiletRequests;
