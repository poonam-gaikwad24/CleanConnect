import type { HealthFactor, HealthLabel, ToiletHealth, ToiletHealthSummary } from '../api/toiletHealth';
import {
  buildHealthInsight,
  factorRatio,
  FALLBACK_MAX,
  HEALTH_BANDS,
  Tone,
  toneForRatio,
} from '../utils/healthPresentation';
import Disclosure from './Disclosure';
import SectionCard from './SectionCard';

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

const LABEL_TONE: Record<HealthLabel, Tone> = {
  GOOD: 'good',
  FAIR: 'fair',
  NEEDS_ATTENTION: 'attention',
};

// Full class names written out (not built dynamically) so Tailwind's
// scanner keeps them. Colour is never the only signal: every status also
// has an icon and text, and every bar has its numbers beside it.
const LABEL_STYLE: Record<HealthLabel, string> = {
  GOOD: 'bg-green-100 text-green-800 border-green-300',
  FAIR: 'bg-amber-100 text-amber-800 border-amber-300',
  NEEDS_ATTENTION: 'bg-red-100 text-red-800 border-red-300',
};

// Darker fills so each bar keeps at least ~3.9:1 contrast against its grey track
// (WCAG non-text contrast); the numbers beside every bar carry the meaning as well.
const TONE_BAR: Record<Tone, string> = {
  good: 'bg-green-700',
  fair: 'bg-amber-700',
  attention: 'bg-red-600',
};

export function healthLabelText(
  label: HealthLabel,
  confidence: ToiletHealth['confidence']
): string {
  return confidence === 'LIMITED' ? `${LABEL_TEXT[label]} (limited data)` : LABEL_TEXT[label];
}

// ── small inline icons (decorative; the text next to them carries the meaning) ──

function StatusIcon({ label }: { label: HealthLabel }) {
  const common = {
    'aria-hidden': true as const,
    viewBox: '0 0 20 20',
    className: 'h-4 w-4 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (label === 'GOOD') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="8" />
        <path d="M6.5 10.5l2.5 2.5 4.5-5" />
      </svg>
    );
  }
  if (label === 'FAIR') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="8" />
        <path d="M6.5 10h7" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M10 3l8 14H2L10 3z" />
      <path d="M10 8v4M10 14.4v.1" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5M10 6.3v.1" />
    </svg>
  );
}

// ── pieces ────────────────────────────────────────────────────────

function StatusBadge({ label, confidence }: { label: HealthLabel; confidence: ToiletHealth['confidence'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${LABEL_STYLE[label]} ${
        confidence === 'LIMITED' ? 'border-dashed' : ''
      }`}
    >
      <StatusIcon label={label} />
      {healthLabelText(label, confidence)}
    </span>
  );
}

function ScoreBar({ score, tone }: { score: number; tone: Tone }) {
  return (
    <div
      role="progressbar"
      aria-label="Toilet health score"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${TONE_BAR[tone]}`}
        style={{ width: `${score}%` }}
      />
      {/* faint ticks where Fair and Good begin */}
      <span aria-hidden="true" className="absolute inset-y-0 w-px bg-white/80" style={{ left: `${HEALTH_BANDS.FAIR_MIN}%` }} />
      <span aria-hidden="true" className="absolute inset-y-0 w-px bg-white/80" style={{ left: `${HEALTH_BANDS.GOOD_MIN}%` }} />
    </div>
  );
}

function FactorRow({ factor }: { factor: HealthFactor }) {
  const tone = toneForRatio(factorRatio(factor));
  const width = Math.round(factorRatio(factor) * 100);

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-slate-800">{factor.label}</span>
        <span className="tabular-nums text-slate-700">
          {factor.points}/{factor.maxPoints}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${factor.label} score`}
        aria-valuemin={0}
        aria-valuemax={factor.maxPoints}
        aria-valuenow={factor.points}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${TONE_BAR[tone]}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-1.5 text-slate-600">{factor.detail}</p>
    </li>
  );
}

function maxOf(factors: HealthFactor[], key: HealthFactor['key']): number {
  return factors.find((f) => f.key === key)?.maxPoints ?? FALLBACK_MAX[key];
}

// Plain-language description of the CURRENT backend rules
// (backend/src/utils/toiletHealth.ts). Point maxima come from the API
// response when available, so the text cannot drift from the numbers.
function Methodology({ factors }: { factors: HealthFactor[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      <li>
        <strong>Open Issues</strong> (up to {maxOf(factors, 'OPEN_ISSUES')} points): reduced by
        unresolved complaints according to their severity and how far maintenance has progressed.
      </li>
      <li>
        <strong>Citizen Experience</strong> (up to {maxOf(factors, 'CITIZEN_EXPERIENCE')} points):
        based on citizen ratings, and weighted toward neutral when there are only a few reviews.
      </li>
      <li>
        <strong>Verified Maintenance</strong> (up to {maxOf(factors, 'VERIFIED_MAINTENANCE')}{' '}
        points): based on maintenance verified by an administrator, and reduced while problems
        remain open.
      </li>
      <li>
        Poor citizen ratings also reduce the credit given for having no open complaints and for
        verified maintenance, because unhappy citizens do not always file a complaint.
      </li>
      <li>
        This score is separate from the star rating: stars show how citizens rated their visit,
        while the health score also uses complaints and maintenance records.
      </li>
      <li>
        Score categories: Good ({HEALTH_BANDS.GOOD_MIN}–100), Fair ({HEALTH_BANDS.FAIR_MIN}–
        {HEALTH_BANDS.GOOD_MIN - 1}), Needs Attention (below {HEALTH_BANDS.FAIR_MIN}).
      </li>
    </ul>
  );
}

function HealthBody({ health }: { health: ToiletHealth }) {
  // No score at all: keep the honest "not enough data" state.
  if (health.score === null || health.label === null) {
    return (
      <div>
        <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
          <InfoIcon />
          <div>
            <p className="font-medium text-slate-800">Not enough data yet</p>
            {health.notes.map((note) => (
              <p key={note} className="mt-1 text-sm text-slate-600">
                {note}
              </p>
            ))}
          </div>
        </div>
        <Disclosure title="How is this calculated?">
          <Methodology factors={health.factors} />
        </Disclosure>
      </div>
    );
  }

  const { score, label } = health;
  const insight = buildHealthInsight(health);
  const limited = health.confidence === 'LIMITED';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-4xl font-bold text-slate-900" aria-label={`Health score ${score} out of 100`}>
          {score}
          <span className="text-lg font-medium text-slate-500">/100</span>
        </p>
        <StatusBadge label={label} confidence={health.confidence} />
      </div>

      <ScoreBar score={score} tone={LABEL_TONE[label]} />

      <p className="mt-3 text-sm text-slate-600">
        Estimated condition based on citizen reviews, complaints, and verified maintenance records.
      </p>

      {insight && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-800">
          <InfoIcon />
          <span>{insight}</span>
        </p>
      )}

      <p className={`mt-3 text-xs ${limited ? 'font-medium text-amber-800' : 'text-slate-600'}`}>
        Based on {health.evidenceCount} {health.evidenceCount === 1 ? 'record' : 'records'} ·{' '}
        {limited ? 'Limited' : 'Sufficient'} evidence
      </p>

      <Disclosure title="View score breakdown">
        <ul className="space-y-4">
          {health.factors.map((factor) => (
            <FactorRow key={factor.key} factor={factor} />
          ))}
        </ul>
        {health.notes.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <p className="font-medium text-slate-800">Notes</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
              {health.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </Disclosure>

      <Disclosure title="How is this calculated?">
        <Methodology factors={health.factors} />
      </Disclosure>

      <p className="mt-4 text-xs text-slate-600">
        This is an estimate based on available records, not a physical inspection, and may not
        reflect current conditions.
      </p>
    </div>
  );
}

interface ToiletHealthViewProps {
  state: HealthViewState;
  onRetry?: () => void;
}

function ToiletHealthView({ state, onRetry }: ToiletHealthViewProps) {
  return (
    <SectionCard title="Toilet Health Score" headingId="toilet-health-heading">
      {state.status === 'loading' && (
        <div>
          <p role="status" aria-live="polite" className="text-sm text-slate-600">
            Loading health score…
          </p>
          <div aria-hidden="true" className="mt-3 animate-pulse space-y-3 motion-reduce:animate-none">
            <div className="h-9 w-32 rounded bg-slate-200" />
            <div className="h-3 w-full rounded-full bg-slate-200" />
            <div className="h-4 w-3/4 rounded bg-slate-200" />
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>{state.message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-outline-danger mt-2"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {state.status === 'ready' && <HealthBody health={state.health} />}
    </SectionCard>
  );
}

// ── compact badge for list pages (unchanged behaviour) ────────────

export type HealthBadgeState =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; summary: ToiletHealthSummary };

export function ToiletHealthBadge(props: HealthBadgeState) {
  if (props.state === 'loading') {
    return (
      <span aria-busy="true" className="text-xs text-slate-600">
        Health score: loading…
      </span>
    );
  }

  if (props.state === 'error') {
    return <span className="text-xs text-slate-600">Health score unavailable</span>;
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
