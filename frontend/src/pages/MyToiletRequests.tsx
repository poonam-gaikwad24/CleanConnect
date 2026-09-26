import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyToiletRequests, ToiletRequest } from '../api/toiletRequests';
import { requestStatusLabel } from '../utils/requestLabels';

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
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">My Toilet Requests</h1>
        <Link
          to="/toilet-requests/create"
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Request Toilet Registration
        </Link>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {requests && requests.length === 0 && (
        <p className="text-slate-500">You haven't requested any toilet registrations yet.</p>
      )}

      {requests && requests.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {requests.map((request) => (
            <li key={request.id} className="p-4 hover:bg-slate-50">
              <Link to={`/toilet-requests/${request.id}`} className="block">
                <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                  Request #{request.requestCode}
                </p>
                <p className="font-medium text-slate-800">{request.location}</p>
                <p className="text-sm text-slate-500">
                  Status: {requestStatusLabel(request.status)}
                  {request.resultingToilet?.cleanConnectId
                    ? ` · Registered as ${request.resultingToilet.cleanConnectId}`
                    : ''}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyToiletRequests;
