// Module 9: Toilet Health / Condition Score — pure scoring logic.
//
// This file has NO database, clock, or framework dependency: the same
// input always produces the same output. That is what makes it
// unit-testable, explainable in a demo, and reusable by Module 10
// (admin analytics) without duplicating any rules.
//
// The score is an ESTIMATE built from citizen reviews, complaints and
// admin-verified maintenance records. It is not an inspection and does
// not prove the toilet's actual physical condition.
//
// ─────────────────────────────────────────────────────────────────
// THE FORMULA (0–100)            [revision 2 — weights 50 / 40 / 10]
//
//   score = OPEN ISSUES (0–50) + CITIZEN EXPERIENCE (0–40)
//         + VERIFIED MAINTENANCE (0–10)
//
// 0. CITIZEN SATISFACTION & TRUST (computed first; used by 1 and 3)
//    The average star rating is "shrunk" toward a neutral 3.0 as if 3
//    neutral reviews already existed, so one review cannot dominate:
//      adjusted = (n × avg + 3 × 3.0) / (n + 3)         (no reviews ⇒ 3.0)
//    trust = clamp((adjusted − 1) / 2, 0, 1)            3★ or better ⇒ 100%,
//                                                       2★ ⇒ 50%, 1★ ⇒ 0%
//    WHY: "no open complaints" and "past fixes" are INDIRECT evidence
//    (absence of reports). Unhappy citizens do not always file a
//    complaint, so that indirect evidence is only trusted in proportion
//    to how satisfied citizens actually are. In revision 1 this credit
//    was unconditional, so even 50 reviews of 1★ with no complaints
//    still scored 61 ("Fair").
//
// 1. OPEN ISSUES — 50 points.
//    penalty = Σ categoryBase × stageFactor over complaints that are not
//    RESOLVED (capped at 50), then
//      points = (50 − penalty) × trust
//    categoryBase: WATER_SHORTAGE 20, BROKEN_INFRASTRUCTURE 20,
//                  CLEANLINESS 15, OTHER 8
//      (no water / broken fixtures make a toilet unusable; dirt makes it
//       unpleasant but usable; OTHER is unspecified)
//    stageFactor — how far the fix has progressed, read from the
//    complaint's MaintenanceTask (1:1 with the complaint):
//       nothing done yet (PENDING, no task)       1.0
//       complaint IN_PROGRESS but no task         0.8
//       task ASSIGNED                             0.8
//       task REVISION_REQUIRED (work rejected)    0.8
//       task IN_PROGRESS                          0.6
//       task SUBMITTED (done, not yet verified)   0.4
//       task VERIFIED but complaint still open    1.0  (inconsistent
//          state — e.g. an admin re-opened it — earns no credit)
//    Repeat reports in the same category are probably the same physical
//    problem: within a category only the largest penalty counts in full
//    and each further one adds 25%.
//
// 2. CITIZEN EXPERIENCE — 40 points.
//      points = 40 × (adjusted − 1) / 4
//    5★ ⇒ 40, 3★ ⇒ 20, 1★ ⇒ 0 (with many reviews). No reviews ⇒ the
//    neutral 20, and the response says so.
//
// 3. VERIFIED MAINTENANCE — up to 10 points.
//      raw   = 5 per complaint that is RESOLVED *and* whose task was
//              VERIFIED by an admin (max 10)
//      points = raw × trust × (50 − penalty) / 50
//    The bonus shrinks as unresolved problems grow (it cannot conceal
//    them) and as citizen satisfaction falls. A manually-RESOLVED
//    complaint with no verified task removes its penalty but earns NO
//    bonus: "resolved" is never assumed to mean "verified".
//
// NOT DOUBLE COUNTED: a complaint and its task are ONE problem. An open
// complaint contributes only through its penalty; a resolved one only
// through the bonus; reviews are never read for complaint text.
//
// NO CLOCK: complaint age is deliberately NOT used, so the same database
// state always yields the same score at any time.
//
// ROUNDING: each factor is rounded half-up to one decimal (integer
// tenths, with a tiny tolerance so binary floating-point error cannot
// flip an exact .x5); score = round-half-up(sum of those tenths ÷ 10).
// The factors you see always add up to the score you see.
//
// DATA SUFFICIENCY — evidence = reviews + complaints:
//    0                       ⇒ INSUFFICIENT: score is null (no false precision)
//    1–2, OR no reviews yet  ⇒ LIMITED: score shown, flagged as a rough estimate
//    3+ with ≥1 review       ⇒ SUFFICIENT
//
// LABELS: GOOD ≥ 75, FAIR 50–74, NEEDS_ATTENTION < 50.
// ─────────────────────────────────────────────────────────────────

// Local mirrors of the Prisma enums. Kept as plain string unions so
// this file (and its tests) never need the generated Prisma client;
// Prisma's enum types are structurally assignable to these.
export type ComplaintCategoryName =
  | 'CLEANLINESS'
  | 'WATER_SHORTAGE'
  | 'BROKEN_INFRASTRUCTURE'
  | 'OTHER';
export type ComplaintStatusName = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
export type TaskStatusName =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVISION_REQUIRED'
  | 'VERIFIED';

export const HEALTH_CONFIG = {
  MAX_OPEN_ISSUES: 50,
  MAX_EXPERIENCE: 40,
  MAX_VERIFIED_BONUS: 10,
  CATEGORY_PENALTY: {
    WATER_SHORTAGE: 20,
    BROKEN_INFRASTRUCTURE: 20,
    CLEANLINESS: 15,
    OTHER: 8,
  } as Record<ComplaintCategoryName, number>,
  STAGE_FACTOR: {
    NO_TASK_PENDING: 1.0,
    NO_TASK_IN_PROGRESS: 0.8,
    ASSIGNED: 0.8,
    REVISION_REQUIRED: 0.8,
    IN_PROGRESS: 0.6,
    SUBMITTED: 0.4,
    VERIFIED_BUT_OPEN: 1.0,
  },
  REPEAT_REPORT_WEIGHT: 0.25,
  PRIOR_MEAN: 3.0,
  PRIOR_WEIGHT: 3,
  BONUS_PER_VERIFIED_FIX: 5,
  LIMITED_EVIDENCE_BELOW: 3,
  MIN_REVIEWS_FOR_SUFFICIENT: 1,
  GOOD_MIN: 75,
  FAIR_MIN: 50,
} as const;

export type HealthLabel = 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION';
export type HealthConfidence = 'INSUFFICIENT' | 'LIMITED' | 'SUFFICIENT';

export interface OpenComplaintInput {
  category: ComplaintCategoryName;
  status: ComplaintStatusName;
  // Status of this complaint's MaintenanceTask, or null if none.
  taskStatus: TaskStatusName | null;
}

export interface ToiletHealthInput {
  reviewCount: number;
  averageRating: number | null;
  // All complaints ever filed for the toilet, any status.
  totalComplaints: number;
  // Only the complaints that are not RESOLVED.
  openComplaints: OpenComplaintInput[];
  // Complaints that are RESOLVED and whose task is VERIFIED.
  verifiedFixes: number;
}

export interface HealthFactor {
  key: 'OPEN_ISSUES' | 'CITIZEN_EXPERIENCE' | 'VERIFIED_MAINTENANCE';
  label: string;
  points: number; // one decimal place
  maxPoints: number;
  detail: string;
}

export interface ToiletHealth {
  score: number | null; // integer 0–100, or null when INSUFFICIENT
  label: HealthLabel | null;
  confidence: HealthConfidence;
  evidenceCount: number;
  factors: HealthFactor[];
  notes: string[];
}

export type ToiletHealthSummary = Pick<
  ToiletHealth,
  'score' | 'label' | 'confidence' | 'evidenceCount'
>;

const CATEGORY_NAME: Record<ComplaintCategoryName, string> = {
  WATER_SHORTAGE: 'water shortage',
  BROKEN_INFRASTRUCTURE: 'broken infrastructure',
  CLEANLINESS: 'cleanliness',
  OTHER: 'other',
};

// ── helpers ────────────────────────────────────────────────────────

function safeCount(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// Points are carried as integer tenths. The 1e-7 tolerance stops binary
// floating-point error from turning an exact half (e.g. 8.75) into
// 8.749999999999998 and rounding it the wrong way.
function toTenths(points: number): number {
  return Math.round(points * 10 + 1e-7);
}

// Share (0–1) of the indirect "absence of problems" evidence we trust,
// based on the shrunk average rating. See the formula notes above.
export function trustFromRating(adjusted: number): number {
  const { PRIOR_MEAN } = HEALTH_CONFIG;
  return Math.min(1, Math.max(0, (adjusted - 1) / (PRIOR_MEAN - 1)));
}

export function labelForScore(score: number): HealthLabel {
  if (score >= HEALTH_CONFIG.GOOD_MIN) return 'GOOD';
  if (score >= HEALTH_CONFIG.FAIR_MIN) return 'FAIR';
  return 'NEEDS_ATTENTION';
}

export function stageFactor(c: OpenComplaintInput): number {
  const f = HEALTH_CONFIG.STAGE_FACTOR;
  switch (c.taskStatus) {
    case 'ASSIGNED':
      return f.ASSIGNED;
    case 'IN_PROGRESS':
      return f.IN_PROGRESS;
    case 'SUBMITTED':
      return f.SUBMITTED;
    case 'REVISION_REQUIRED':
      return f.REVISION_REQUIRED;
    case 'VERIFIED':
      return f.VERIFIED_BUT_OPEN;
    default:
      return c.status === 'IN_PROGRESS' ? f.NO_TASK_IN_PROGRESS : f.NO_TASK_PENDING;
  }
}

// ── component 2 (computed first): citizen experience & trust ──────

interface ExperienceResult {
  tenths: number;
  adjusted: number; // shrunk average rating, 1–5 (3.0 when there are no reviews)
  trust: number; // 0–1, see trustFromRating
  detail: string;
}

function computeExperience(reviewCount: number, averageRating: number | null): ExperienceResult {
  const { PRIOR_MEAN, PRIOR_WEIGHT, MAX_EXPERIENCE } = HEALTH_CONFIG;

  if (reviewCount === 0 || averageRating === null) {
    return {
      tenths: toTenths(MAX_EXPERIENCE * ((PRIOR_MEAN - 1) / 4)),
      adjusted: PRIOR_MEAN,
      trust: 1,
      detail: 'No reviews yet — a neutral value is used until citizens rate this toilet.',
    };
  }

  const avg = Math.min(5, Math.max(1, averageRating));
  const adjusted = (reviewCount * avg + PRIOR_WEIGHT * PRIOR_MEAN) / (reviewCount + PRIOR_WEIGHT);

  return {
    tenths: toTenths(MAX_EXPERIENCE * ((adjusted - 1) / 4)),
    adjusted,
    trust: trustFromRating(adjusted),
    detail:
      `Average ${avg.toFixed(1)}★ from ${plural(reviewCount, 'review')}.` +
      (reviewCount < 10 ? ' With few reviews, the average is weighted toward neutral.' : ''),
  };
}

// ── component 1: open issues ──────────────────────────────────────

interface OpenIssuesResult {
  tenths: number;
  // Share of the open-issues component that is still intact (0–1)
  // before trust is applied: (50 − penalty) / 50.
  remaining: number;
  detail: string;
}

function computeOpenIssues(open: OpenComplaintInput[], trust: number): OpenIssuesResult {
  const max = HEALTH_CONFIG.MAX_OPEN_ISSUES;

  const byCategory = new Map<ComplaintCategoryName, number[]>();
  for (const c of open) {
    const base =
      HEALTH_CONFIG.CATEGORY_PENALTY[c.category] ?? HEALTH_CONFIG.CATEGORY_PENALTY.OTHER;
    const key: ComplaintCategoryName = c.category in CATEGORY_NAME ? c.category : 'OTHER';
    const list = byCategory.get(key) ?? [];
    list.push(base * stageFactor(c));
    byCategory.set(key, list);
  }

  let penalty = 0;
  for (const list of byCategory.values()) {
    list.sort((a, b) => b - a);
    const [largest, ...rest] = list;
    penalty += largest + HEALTH_CONFIG.REPEAT_REPORT_WEIGHT * rest.reduce((s, p) => s + p, 0);
  }
  penalty = Math.min(max, penalty);

  const remainingPoints = max - penalty;
  const trustNote =
    trust < 1
      ? ` Credit counted at ${Math.round(trust * 100)}% because citizen ratings are low.`
      : '';

  if (open.length === 0) {
    return {
      tenths: toTenths(remainingPoints * trust),
      remaining: 1,
      detail: 'No open complaints.' + trustNote,
    };
  }

  const parts = [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, list]) => `${list.length} ${CATEGORY_NAME[cat]}`);

  const underway = open.filter(
    (c) => c.taskStatus === 'ASSIGNED' || c.taskStatus === 'IN_PROGRESS'
  ).length;
  const awaiting = open.filter((c) => c.taskStatus === 'SUBMITTED').length;

  const progress: string[] = [];
  if (underway > 0) progress.push(`${underway} with staff assigned or working`);
  if (awaiting > 0) progress.push(`${awaiting} awaiting admin verification`);

  return {
    tenths: toTenths(remainingPoints * trust),
    remaining: remainingPoints / max,
    detail:
      `${plural(open.length, 'open complaint')}: ${parts.join(', ')}.` +
      (progress.length > 0 ? ` ${progress.join('; ')}.` : '') +
      trustNote,
  };
}

// ── component 3: verified maintenance ─────────────────────────────

function computeVerifiedBonus(
  verifiedFixes: number,
  trust: number,
  remaining: number
): { tenths: number; detail: string } {
  if (verifiedFixes === 0) {
    return { tenths: 0, detail: 'No admin-verified fixes recorded yet.' };
  }

  const raw = Math.min(
    HEALTH_CONFIG.MAX_VERIFIED_BONUS,
    verifiedFixes * HEALTH_CONFIG.BONUS_PER_VERIFIED_FIX
  );
  const multiplier = trust * remaining;

  const reasons: string[] = [];
  if (trust < 1) reasons.push('citizen ratings are low');
  if (remaining < 1) reasons.push('complaints are still open');

  return {
    tenths: toTenths(raw * multiplier),
    detail:
      `${plural(verifiedFixes, 'complaint')} resolved and verified by an admin.` +
      (multiplier < 1
        ? ` Counted at ${Math.round(multiplier * 100)}% because ${reasons.join(' and ')}.`
        : ''),
  };
}

// ── public entry point ────────────────────────────────────────────

export function calculateToiletHealth(input: ToiletHealthInput): ToiletHealth {
  // Defensive normalisation: bad or inconsistent data must never
  // produce NaN, a negative score, or a score above 100.
  const open = (input.openComplaints ?? []).filter((c) => c.status !== 'RESOLVED');

  const ratingUsable =
    typeof input.averageRating === 'number' && Number.isFinite(input.averageRating);
  const reviewCount = ratingUsable ? safeCount(input.reviewCount) : 0;
  const averageRating = ratingUsable && reviewCount > 0 ? (input.averageRating as number) : null;

  const totalComplaints = Math.max(safeCount(input.totalComplaints), open.length);
  const verifiedFixes = Math.min(safeCount(input.verifiedFixes), totalComplaints - open.length);

  const evidenceCount = reviewCount + totalComplaints;

  if (evidenceCount === 0) {
    return {
      score: null,
      label: null,
      confidence: 'INSUFFICIENT',
      evidenceCount: 0,
      factors: [],
      notes: [
        'No reviews or complaints have been recorded for this toilet yet, so a health score cannot be calculated.',
      ],
    };
  }

  const experience = computeExperience(reviewCount, averageRating);
  const issues = computeOpenIssues(open, experience.trust);
  const bonus = computeVerifiedBonus(verifiedFixes, experience.trust, issues.remaining);

  const totalTenths = issues.tenths + experience.tenths + bonus.tenths;
  const score = Math.min(100, Math.max(0, Math.round(totalTenths / 10)));

  const confidence: HealthConfidence =
    evidenceCount < HEALTH_CONFIG.LIMITED_EVIDENCE_BELOW ||
    reviewCount < HEALTH_CONFIG.MIN_REVIEWS_FOR_SUFFICIENT
      ? 'LIMITED'
      : 'SUFFICIENT';

  const notes: string[] = [];
  if (evidenceCount < HEALTH_CONFIG.LIMITED_EVIDENCE_BELOW) {
    notes.push(
      `Based on limited information (${plural(evidenceCount, 'record')}). Treat this score as a rough estimate.`
    );
  }
  if (reviewCount === 0) {
    notes.push('No citizen reviews yet, so this estimate rests on complaint records only.');
  }
  if (experience.trust < 1) {
    notes.push(
      `Citizen ratings are below average, so credit for having no open complaints and for past fixes is reduced to ${Math.round(
        experience.trust * 100
      )}%.`
    );
  }
  if (totalComplaints === 0) {
    notes.push(
      'No complaints have been recorded. That is not proof the toilet is well maintained, so the top of the scale is reserved for toilets with verified maintenance.'
    );
  }

  return {
    score,
    label: labelForScore(score),
    confidence,
    evidenceCount,
    factors: [
      {
        key: 'OPEN_ISSUES',
        label: 'Open issues',
        points: issues.tenths / 10,
        maxPoints: HEALTH_CONFIG.MAX_OPEN_ISSUES,
        detail: issues.detail,
      },
      {
        key: 'CITIZEN_EXPERIENCE',
        label: 'Citizen experience',
        points: experience.tenths / 10,
        maxPoints: HEALTH_CONFIG.MAX_EXPERIENCE,
        detail: experience.detail,
      },
      {
        key: 'VERIFIED_MAINTENANCE',
        label: 'Verified maintenance',
        points: bonus.tenths / 10,
        maxPoints: HEALTH_CONFIG.MAX_VERIFIED_BONUS,
        detail: bonus.detail,
      },
    ],
    notes,
  };
}

export function summarizeHealth(health: ToiletHealth): ToiletHealthSummary {
  return {
    score: health.score,
    label: health.label,
    confidence: health.confidence,
    evidenceCount: health.evidenceCount,
  };
}

// ── turning grouped DB rows into per-toilet inputs ────────────────
// Pure on purpose, so the row-to-input mapping is testable without a
// database. The service feeds it the results of its four queries.

export interface ReviewAggRow {
  toiletId: string;
  averageRating: number | null;
  count: number;
}

export interface CountRow {
  toiletId: string;
  count: number;
}

export interface OpenComplaintRow extends OpenComplaintInput {
  toiletId: string;
}

export function emptyHealthInput(): ToiletHealthInput {
  return {
    reviewCount: 0,
    averageRating: null,
    totalComplaints: 0,
    openComplaints: [],
    verifiedFixes: 0,
  };
}

export function assembleHealthInputs(
  toiletIds: string[],
  reviews: ReviewAggRow[],
  complaintTotals: CountRow[],
  openRows: OpenComplaintRow[],
  verified: CountRow[]
): Map<string, ToiletHealthInput> {
  const inputs = new Map<string, ToiletHealthInput>();
  for (const id of toiletIds) inputs.set(id, emptyHealthInput());

  for (const r of reviews) {
    const input = inputs.get(r.toiletId);
    if (input) {
      input.reviewCount = r.count;
      input.averageRating = r.averageRating;
    }
  }
  for (const r of complaintTotals) {
    const input = inputs.get(r.toiletId);
    if (input) input.totalComplaints = r.count;
  }
  for (const r of openRows) {
    const input = inputs.get(r.toiletId);
    if (input) {
      input.openComplaints.push({
        category: r.category,
        status: r.status,
        taskStatus: r.taskStatus,
      });
    }
  }
  for (const r of verified) {
    const input = inputs.get(r.toiletId);
    if (input) input.verifiedFixes = r.count;
  }

  return inputs;
}
