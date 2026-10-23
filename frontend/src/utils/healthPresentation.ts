import type { HealthFactor, ToiletHealth } from '../api/toiletHealth';

// Presentation helpers for the Toilet Health Score card. Pure functions
// (no React, no network) so they can be unit-tested. They never change the
// score: they only read what the API already returned.

// Label boundaries, as documented in the backend (GOOD ≥ 75, FAIR 50–74).
export const HEALTH_BANDS = { GOOD_MIN: 75, FAIR_MIN: 50 } as const;

// Only used for the methodology text when the API returned no factors
// (the "not enough data" state). When factors exist, their own maxPoints win.
export const FALLBACK_MAX = {
  OPEN_ISSUES: 50,
  CITIZEN_EXPERIENCE: 40,
  VERIFIED_MAINTENANCE: 10,
} as const;

export type Tone = 'good' | 'fair' | 'attention';

// Same cut-offs as the overall bands, applied to a factor's share of its maximum.
export function toneForRatio(ratio: number): Tone {
  if (ratio >= HEALTH_BANDS.GOOD_MIN / 100) return 'good';
  if (ratio >= HEALTH_BANDS.FAIR_MIN / 100) return 'fair';
  return 'attention';
}

export function factorRatio(factor: HealthFactor): number {
  if (!(factor.maxPoints > 0)) return 0;
  return Math.min(1, Math.max(0, factor.points / factor.maxPoints));
}

function factorOf(health: ToiletHealth, key: HealthFactor['key']): HealthFactor | undefined {
  return health.factors.find((f) => f.key === key);
}

// A short sentence about the main driver of the score — or null when the
// data does not clearly support one. Everything is recovered from the
// factor points the API returns (no hardcoded messages, no text parsing):
//
//   citizen ratings : experience = max × (adjusted − 1) / 4
//                     ⇒ adjusted average = 1 + 4 × (points / max)
//   trust           : min(1, (adjusted − 1) / 2) = min(1, 2 × ratio)
//   open complaints : openIssues = (max − penalty) × trust
//                     ⇒ penalty = max − points / trust
//
// This mirrors the backend formula, so it must be revisited if that
// formula changes. Where the numbers cannot answer reliably (trust too low
// for rounding error to be ignored) it stays silent about that part.
const MIN_TRUST_TO_INFER = 0.25;

export function buildHealthInsight(health: ToiletHealth): string | null {
  if (health.score === null) return null;

  const experience = factorOf(health, 'CITIZEN_EXPERIENCE');
  const issues = factorOf(health, 'OPEN_ISSUES');
  if (!experience || !issues || !(experience.maxPoints > 0) || !(issues.maxPoints > 0)) {
    return null;
  }

  const ratio = Math.min(1, Math.max(0, experience.points / experience.maxPoints));
  const adjusted = 1 + 4 * ratio;

  // Margins of 0.02 stay clear of the one-decimal rounding of the points.
  const ratings: 'low' | 'belowAverage' | 'high' | 'neutral' =
    adjusted < 2.5 ? 'low' : adjusted < 2.98 ? 'belowAverage' : adjusted >= 3.98 ? 'high' : 'neutral';

  const trust = Math.min(1, 2 * ratio);
  let open: 'none' | 'some' | 'unknown' = 'unknown';
  if (trust >= MIN_TRUST_TO_INFER) {
    const penalty = issues.maxPoints - issues.points / trust;
    const tolerance = 0.25 / trust + 0.05; // rounding error of the displayed points
    open = penalty > tolerance ? 'some' : 'none';
  }

  if (ratings === 'low' || ratings === 'belowAverage') {
    const phrase = ratings === 'low' ? 'Citizen ratings are low' : 'Citizen ratings are below average';
    if (open === 'none') return `${phrase}, although no complaints are currently open.`;
    if (open === 'some') return `${phrase}, and unresolved complaints are also lowering this score.`;
    return `${phrase}, which is lowering this score.`;
  }

  if (open === 'some') {
    return ratings === 'high'
      ? 'Citizen ratings are high, but unresolved complaints are lowering this score.'
      : 'Unresolved complaints are lowering this score.';
  }

  if (open === 'none') {
    return ratings === 'high'
      ? 'Citizen ratings are high and no complaints are currently open.'
      : 'No complaints are currently open.';
  }

  return null;
}
