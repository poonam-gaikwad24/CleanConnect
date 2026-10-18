import type { HealthLabel, ToiletHealth, ToiletHealthSummary } from '../api/toiletHealth';

// Purely presentational (props in, markup out) and deliberately free of
// axios / import.meta.env imports, so every state can be rendered and
// tested without a browser or backend. ToiletHealthCard.tsx does the
// fetching and passes the state in.

export type HealthViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; health: ToiletHealth };

const LABEL_TEXT: Record<HealthLabel, string> = {
  GOOD: 'Good',
  FAIR: 'Fair',
  NEEDS_ATTENTION: 'Needs Attention',
};

// Full class names written out (not built dynamically) so Tailwind's
// scanner keeps them. Colour is never the only signal — the label text
// and the number are always shown too.
const LABEL_STYLE: Record<HealthLabel, string> = {
  GOOD: 'bg-green-100 text-green-800 border-green-300',
  FAIR: 'bg-amber-100 text-amber-800 border-amber-300',
  NEEDS_ATTENTION: 'bg-red-100 text-red-800 border-red-300',
};

const BAR_STYLE: Record<HealthLabel, string> = {
  GOOD: 'bg-green-600',
  FAIR: 'bg-amber-500',
  NEEDS_ATTENTION: 'bg-red-600',
};

export function healthLabelText(
  label: HealthLabel,
  confidence: ToiletHealth['confidence']
): string {
  return confidence === 'LIMITED' ? `${LABEL_TEXT[label]} (limited data)` : LABEL_TEXT[label];
}

interface ToiletHealthViewProps {
  state: HealthViewState;
  onRetry?: () => void;
}

function ToiletHealthView({ state, onRetry }: ToiletHealthViewProps) {
  return (
    <section aria-labelledby="toilet-health-heading" className="mt-6 border-t border-slate-200 pt-4">
      <h2 id="toilet-health-heading" className="mb-1 text-lg font-bold text-slate-800">
        Toilet Health Score
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        An estimate based on the reviews, complaints and admin-verified maintenance records
        available for this toilet. It is not an inspection and may not match its condition right
        now. It is separate from the star rating below, which only reflects citizens&apos; opinions
        of their visit.
      </p>

      {state.status === 'loading' && (
        <p role="status" aria-live="polite" className="text-sm text-slate-500">
          Loading health score…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{state.message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-100"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {state.status === 'ready' && <HealthBody health={state.health} />}
    </section>
  );
}

function HealthBody({ health }: { health: ToiletHealth }) {
  if (health.score === null || health.label === null) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 p-3">
        <p className="font-medium text-slate-700">Not enough data yet</p>
        {health.notes.map((note) => (
          <p key={note} className="mt-1 text-sm text-slate-600">
            {note}
          </p>
        ))}
      </div>
    );
  }

  const { score, label } = health;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-3xl font-bold text-slate-800" aria-label={`Health score ${score} out of 100`}>
          {score}
          <span className="text-base font-normal text-slate-500"> / 100</span>
        </p>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${LABEL_STYLE[label]} ${
            health.confidence === 'LIMITED' ? 'border-dashed' : ''
          }`}
        >
          {healthLabelText(label, health.confidence)}
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        Based on {health.evidenceCount} {health.evidenceCount === 1 ? 'record' : 'records'} (reviews
        and complaints).
      </p>

      <div
        role="progressbar"
        aria-label="Toilet health score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200"
      >
        <div className={`h-full ${BAR_STYLE[label]}`} style={{ width: `${score}%` }} />
      </div>

      {health.notes.length > 0 && (
        <ul className="mt-3 space-y-1 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          {health.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-semibold text-slate-700">What raised or lowered this score</h3>
      <ul className="mt-1 space-y-2">
        {health.factors.map((factor) => (
          <li key={factor.key} className="text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-slate-700">{factor.label}</span>
              <span className="text-slate-600">
                {factor.points} / {factor.maxPoints}
              </span>
            </div>
            <p className="text-slate-500">{factor.detail}</p>
          </li>
        ))}
      </ul>

      <details className="mt-3 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-700">How is this calculated?</summary>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>Open issues (up to 50):</strong> starts at 50 and loses points for each
            unresolved complaint — more for water or broken-facility problems, less once staff are
            working on it.
          </li>
          <li>
            <strong>Citizen experience (up to 40):</strong> the average star rating, weighted toward
            neutral when there are only a few reviews.
          </li>
          <li>
            <strong>Verified maintenance (up to 10):</strong> credit for fixes an admin has verified,
            reduced while problems are still open.
          </li>
          <li>
            If citizens rate the toilet poorly, the credit for having no complaints and for past
            fixes is reduced, because unhappy people do not always file a complaint.
          </li>
          <li>Good is 75 or more, Fair is 50–74, Needs Attention is below 50.</li>
        </ul>
      </details>
    </div>
  );
}

// ── compact badge for list pages ──────────────────────────────────

export type HealthBadgeState =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; summary: ToiletHealthSummary };

export function ToiletHealthBadge(props: HealthBadgeState) {
  if (props.state === 'loading') {
    return (
      <span aria-busy="true" className="text-xs text-slate-400">
        Health score: loading…
      </span>
    );
  }

  if (props.state === 'error') {
    return <span className="text-xs text-slate-400">Health score unavailable</span>;
  }

  const { score, label, confidence } = props.summary;

  if (score === null || label === null) {
    return <span className="text-xs text-slate-500">Health score: not enough data</span>;
  }

  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${LABEL_STYLE[label]} ${
        confidence === 'LIMITED' ? 'border-dashed' : ''
      }`}
    >
      Health {score}/100 · {healthLabelText(label, confidence)}
    </span>
  );
}

export default ToiletHealthView;
