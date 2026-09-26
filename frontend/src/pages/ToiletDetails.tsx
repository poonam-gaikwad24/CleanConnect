import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getToiletById, Toilet } from '../api/toilets';
import { buildGoogleMapsSearchUrl } from '../utils/googleMapsLink';
import { useAuth } from '../context/AuthContext';

function ToiletDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [toilet, setToilet] = useState<Toilet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    getToiletById(id)
      .then(setToilet)
      .catch(() => setError('Toilet not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link to="/toilets" className="text-sm text-slate-500 hover:underline">
        ← Back to list
      </Link>

      {loading && <p className="mt-4 text-slate-500">Loading…</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {toilet && (
        <div className="mt-4 rounded border border-slate-200 bg-white p-6">
          <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
            CleanConnect ID: {toilet.cleanConnectId ?? 'Not yet assigned'}
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">{toilet.location}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-4">
            <a
              href={buildGoogleMapsSearchUrl(toilet.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              View on Google Maps
            </a>
            {user && (
              <Link
                to={`/complaints/create?toilet=${toilet.cleanConnectId ?? toilet.id}`}
                className="inline-block text-sm font-medium text-slate-600 hover:underline"
              >
                Report an issue
              </Link>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            The Google Maps link opens a search near this registered address. This is an
            independent Google Maps search, not a confirmed exact match to CleanConnect's record.
          </p>

          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Source (PMC) ID</dt>
              <dd className="text-slate-800">
                {toilet.externalId ?? 'None — registered directly via CleanConnect'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Type</dt>
              <dd className="text-slate-800">{toilet.type ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Ward</dt>
              <dd className="text-slate-800">{toilet.ward ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Landmark</dt>
              <dd className="text-slate-800">{toilet.landmark ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Status</dt>
              <dd className="text-slate-800">{toilet.status ?? 'Not recorded'}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

export default ToiletDetails;
