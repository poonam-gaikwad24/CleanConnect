import { useEffect, useState } from 'react';
import { getToiletHealth } from '../api/toiletHealth';
import ToiletHealthView, { HealthViewState } from './ToiletHealthView';

interface ToiletHealthCardProps {
  toiletId: string;
  // Bump this number to make the card re-fetch (e.g. after a review is
  // added/removed, since reviews feed the score).
  refreshKey?: number;
}

function ToiletHealthCard({ toiletId, refreshKey = 0 }: ToiletHealthCardProps) {
  const [state, setState] = useState<HealthViewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    getToiletHealth(toiletId)
      .then((response) => {
        if (!cancelled) setState({ status: 'ready', health: response.health });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', message: 'Could not load the health score.' });
      });

    // Ignore a response that arrives after the toilet changed or the
    // component unmounted.
    return () => {
      cancelled = true;
    };
  }, [toiletId, refreshKey, attempt]);

  return <ToiletHealthView state={state} onRetry={() => setAttempt((a) => a + 1)} />;
}

export default ToiletHealthCard;
