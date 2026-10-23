import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getToiletById, Toilet } from '../api/toilets';
import { useAuth } from '../context/AuthContext';
import ToiletReviews from '../components/ToiletReviews';
import ToiletHealthCard from '../components/ToiletHealthCard';
import ToiletDetailsLayout from '../components/ToiletDetailsLayout';

function ToiletDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [toilet, setToilet] = useState<Toilet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Reviews feed the health score, so changing one re-fetches the card.
  const [healthRefreshKey, setHealthRefreshKey] = useState(0);

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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link to="/toilets" className="text-sm font-medium text-slate-600 hover:underline">
        ← Back to list
      </Link>

      {loading && (
        <p role="status" className="mt-4 text-slate-600">
          Loading…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
      )}

      {toilet && (
        <ToiletDetailsLayout
          toilet={toilet}
          role={user?.role ?? null}
          healthCard={<ToiletHealthCard toiletId={toilet.id} refreshKey={healthRefreshKey} />}
          reviews={
            <ToiletReviews
              toiletId={toilet.id}
              onReviewsChanged={() => setHealthRefreshKey((k) => k + 1)}
            />
          }
        />
      )}
    </div>
  );
}

export default ToiletDetails;
