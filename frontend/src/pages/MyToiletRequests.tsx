import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyToiletRequests, ToiletRequest } from '../api/toiletRequests';
import { requestStatusLabel } from '../utils/requestLabels';
import { RequestStatusBadge } from '../components/StatusBadges';
import Alert from '../components/ui/Alert';
import { PinIcon, PlusIcon } from '../components/ui/icons';
import ListCard from '../components/ui/ListCard';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, LoadingState } from '../components/ui/States';

function MyToiletRequests() {
  const [requests, setRequests] = useState<ToiletRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyToiletRequests()
      .then(setRequests)
      .catch(() => setError('Could not load your requests.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="My Toilet Requests"
        subtitle="Toilets you asked to have registered, and the admin's decision on each."
        actions={
          <Link to="/toilet-requests/create" className="btn btn-primary">
            <PlusIcon />
            Request Toilet Registration
          </Link>
        }
      />

      {loading && <LoadingState label="Loading your requests…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {requests && requests.length === 0 && (
        <EmptyState
          icon={<PinIcon className="h-5 w-5" />}
          title="You haven't requested any toilet registrations yet."
          description="If a toilet is missing from the directory, you can ask an admin to register it."
          action={
            <Link to="/toilet-requests/create" className="btn btn-primary">
              Request Toilet Registration
            </Link>
          }
        />
      )}

      {requests && requests.length > 0 && (
        <ul className="grid gap-3">
          {requests.map((request) => (
            <li key={request.id}>
              <ListCard
                to={`/toilet-requests/${request.id}`}
                eyebrow={`Request #${request.requestCode}`}
                title={request.location}
                meta={
                  <>
                    {request.resultingToilet?.cleanConnectId && (
                      <p>Registered as {request.resultingToilet.cleanConnectId}</p>
                    )}
                    <p>Requested {new Date(request.createdAt).toLocaleDateString()}</p>
                  </>
                }
                badges={<RequestStatusBadge status={request.status} />}
              />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

export default MyToiletRequests;
