import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getToiletById, Toilet } from '../api/toilets';
import { useAuth } from '../context/AuthContext';
import ToiletReviews from '../components/ToiletReviews';
import ToiletHealthCard from '../components/ToiletHealthCard';
import Alert from '../components/ui/Alert';
import { ArrowLeftIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import { LoadingState } from '../components/ui/States';
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
    <PageContainer>
      <Link
        to="/toilets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-brand-800 hover:underline"
      >
        <ArrowLeftIcon />
        Back to list
      </Link>

      {loading && <LoadingState label="Loading toilet…" />}
      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
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
    </PageContainer>
  );
}

export default ToiletDetails;
