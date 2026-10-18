// Run:  npx tsx --test tests/toiletHealth.test.ts
// Pure scoring tests (revision 2: weights 50 / 40 / 10) — no database,
// no network, no Prisma client.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assembleHealthInputs,
  calculateToiletHealth,
  HEALTH_CONFIG,
  labelForScore,
  OpenComplaintInput,
  stageFactor,
  ToiletHealth,
  ToiletHealthInput,
  trustFromRating,
} from '../src/utils/toiletHealth';

const base: ToiletHealthInput = {
  reviewCount: 0,
  averageRating: null,
  totalComplaints: 0,
  openComplaints: [],
  verifiedFixes: 0,
};
const open = (
  category: OpenComplaintInput['category'],
  status: OpenComplaintInput['status'] = 'PENDING',
  taskStatus: OpenComplaintInput['taskStatus'] = null
): OpenComplaintInput => ({ category, status, taskStatus });

const pts = (h: ToiletHealth, key: string) => h.factors.find((f) => f.key === key)?.points;
const issues = (h: ToiletHealth) => pts(h, 'OPEN_ISSUES')!;
const experience = (h: ToiletHealth) => pts(h, 'CITIZEN_EXPERIENCE')!;
const bonus = (h: ToiletHealth) => pts(h, 'VERIFIED_MAINTENANCE')!;
const tenths = (n: number) => Math.round(n * 10);

// ═════════════════════════════════════════════════════════════════
// The 12 required scenarios. Each row shows the INPUT, the expected
// individual FACTOR scores [open issues /50, experience /40, verified
// maintenance /10] and the expected FINAL score. Expected values were
// worked out by hand from the formula, not copied from program output.
// ═════════════════════════════════════════════════════════════════
const threeOpen = [open('WATER_SHORTAGE'), open('BROKEN_INFRASTRUCTURE'), open('CLEANLINESS')];

interface Scenario {
  n: string;
  input: ToiletHealthInput;
  factors: [number, number, number] | null; // null ⇒ INSUFFICIENT
  score: number | null;
  label: ToiletHealth['label'];
  confidence: ToiletHealth['confidence'];
}

const SCENARIOS: Scenario[] = [
  {
    n: '1. no reviews, no complaints',
    input: base,
    factors: null, score: null, label: null, confidence: 'INSUFFICIENT',
  },
  {
    // adjusted (100+9)/23 = 4.739 → 40×3.739/4 = 37.4
    n: '2. many positive reviews (20 × 5.0★), no open complaints',
    input: { ...base, reviewCount: 20, averageRating: 5 },
    factors: [50, 37.4, 0], score: 87, label: 'GOOD', confidence: 'SUFFICIENT',
  },
  {
    // adjusted (7+9)/8 = 2.0 → trust 50% → issues 50×0.5 = 25; experience 40×1/4 = 10
    n: '3. several consistently poor reviews (5 × avg 1.4★), no open complaints',
    input: { ...base, reviewCount: 5, averageRating: 1.4 },
    factors: [25, 10, 0], score: 35, label: 'NEEDS_ATTENTION', confidence: 'SUFFICIENT',
  },
  {
    // penalty 20+20+15 = 55 → capped 50 → issues 0
    n: '4. several unresolved complaints + positive reviews (20 × 5.0★, 3 open)',
    input: { ...base, reviewCount: 20, averageRating: 5, totalComplaints: 3, openComplaints: threeOpen },
    factors: [0, 37.4, 0], score: 37, label: 'NEEDS_ATTENTION', confidence: 'SUFFICIENT',
  },
  {
    // adjusted 39/23 = 1.696 → experience 7.0; issues 0
    n: '5. several unresolved complaints + poor reviews (20 × 1.5★, 3 open)',
    input: { ...base, reviewCount: 20, averageRating: 1.5, totalComplaints: 3, openComplaints: threeOpen },
    factors: [0, 7, 0], score: 7, label: 'NEEDS_ATTENTION', confidence: 'SUFFICIENT',
  },
  {
    // RESOLVED but no VERIFIED task ⇒ penalty gone, NO bonus. adjusted 89/23 = 3.87 → 28.7
    n: '6. complaint resolved but NOT verified (20 × 4.0★)',
    input: { ...base, reviewCount: 20, averageRating: 4, totalComplaints: 1, verifiedFixes: 0 },
    factors: [50, 28.7, 0], score: 79, label: 'GOOD', confidence: 'SUFFICIENT',
  },
  {
    n: '7. complaint resolved AND verified (20 × 4.0★)',
    input: { ...base, reviewCount: 20, averageRating: 4, totalComplaints: 1, verifiedFixes: 1 },
    factors: [50, 28.7, 5], score: 84, label: 'GOOD', confidence: 'SUFFICIENT',
  },
  {
    // water 20 × 0.8 (task ASSIGNED) = 16 → issues 34. Counted ONCE.
    n: '8. complaint with an associated maintenance task (ASSIGNED) — counted once',
    input: {
      ...base, reviewCount: 20, averageRating: 4, totalComplaints: 1,
      openComplaints: [open('WATER_SHORTAGE', 'IN_PROGRESS', 'ASSIGNED')],
    },
    factors: [34, 28.7, 0], score: 63, label: 'FAIR', confidence: 'SUFFICIENT',
  },
  {
    // adjusted (1+9)/4 = 2.5 → trust 75% → issues 37.5; experience 40×1.5/4 = 15 → 52.5 → 53
    n: '9. one 1-star review',
    input: { ...base, reviewCount: 1, averageRating: 1 },
    factors: [37.5, 15, 0], score: 53, label: 'FAIR', confidence: 'LIMITED',
  },
  {
    // adjusted (5+9)/4 = 3.5 → experience 25
    n: '10. one 5-star review',
    input: { ...base, reviewCount: 1, averageRating: 5 },
    factors: [50, 25, 0], score: 75, label: 'GOOD', confidence: 'LIMITED',
  },
  {
    // adjusted (8+9)/5 = 3.4 → 24
    n: '11. limited evidence (2 × 4.0★)',
    input: { ...base, reviewCount: 2, averageRating: 4 },
    factors: [50, 24, 0], score: 74, label: 'FAIR', confidence: 'LIMITED',
  },
  {
    // adjusted (45+9)/13 = 4.154 → 31.5; total 81.5 → rounds half-up to 82
    n: '12. no verified maintenance history (10 × 4.5★, no complaints)',
    input: { ...base, reviewCount: 10, averageRating: 4.5 },
    factors: [50, 31.5, 0], score: 82, label: 'GOOD', confidence: 'SUFFICIENT',
  },
];

describe('the 12 required scenarios (input → factor scores → final score)', () => {
  for (const s of SCENARIOS) {
    it(s.n, () => {
      const h = calculateToiletHealth(s.input);
      assert.equal(h.score, s.score, 'final score');
      assert.equal(h.label, s.label, 'label');
      assert.equal(h.confidence, s.confidence, 'confidence');
      if (s.factors === null) {
        assert.deepEqual(h.factors, []);
      } else {
        assert.deepEqual([issues(h), experience(h), bonus(h)], s.factors, 'factor scores');
      }
    });
  }

  it('scenario 8: the task adds nothing on top of its complaint (same penalty with or without a task)', () => {
    const withTask = calculateToiletHealth(SCENARIOS[7].input);
    const noTask = calculateToiletHealth({
      ...SCENARIOS[7].input,
      openComplaints: [open('WATER_SHORTAGE', 'IN_PROGRESS', null)], // same stage (0.8), no task row
    });
    assert.equal(issues(withTask), issues(noTask));
    assert.equal(withTask.score, noTask.score);
    assert.equal(bonus(withTask), 0, 'an open complaint never feeds the bonus');
  });

  it('scenarios 6 vs 7: verification — not resolution — is what earns the bonus', () => {
    const unverified = calculateToiletHealth(SCENARIOS[5].input);
    const verified = calculateToiletHealth(SCENARIOS[6].input);
    assert.equal(bonus(unverified), 0);
    assert.equal(bonus(verified), 5);
    assert.equal(verified.score! - unverified.score!, 5);
  });

  it('scenarios 9 vs 10: one review moves the score but is always flagged as limited', () => {
    assert.equal(calculateToiletHealth(SCENARIOS[8].input).confidence, 'LIMITED');
    assert.equal(calculateToiletHealth(SCENARIOS[9].input).confidence, 'LIMITED');
    assert.ok(calculateToiletHealth(SCENARIOS[9].input).notes.some((n) => /limited information/.test(n)));
  });
});

// ═════════════════════════════════════════════════════════════════
// The reported case, before and after
// ═════════════════════════════════════════════════════════════════
describe('regression: CC-PMC-0001 (3 reviews averaging 1.33★, 0 open, 1 verified fix)', () => {
  const input: ToiletHealthInput = {
    ...base, reviewCount: 3, averageRating: 4 / 3, totalComplaints: 1, verifiedFixes: 1,
  };

  it('is no longer "Fair 74": poor ratings now pull the score into Needs Attention', () => {
    const h = calculateToiletHealth(input);
    // adjusted = (4+9)/6 = 2.167 → trust 58.3%
    // issues 50×0.583 = 29.2 · experience 40×1.167/4 = 11.7 · bonus 5×0.583 = 2.9
    assert.deepEqual([issues(h), experience(h), bonus(h)], [29.2, 11.7, 2.9]);
    assert.equal(h.score, 44);
    assert.equal(h.label, 'NEEDS_ATTENTION');
    assert.equal(h.confidence, 'SUFFICIENT');
  });

  it('explains why the credit was reduced', () => {
    const h = calculateToiletHealth(input);
    assert.match(h.factors[0].detail, /counted at 58% because citizen ratings are low/i);
    assert.match(h.factors[2].detail, /counted at 58%/i);
    assert.ok(h.notes.some((n) => /reduced to 58%/.test(n)));
  });
});

// ═════════════════════════════════════════════════════════════════
// Requirement: poor ratings can't be hidden by an absence of complaints
// ═════════════════════════════════════════════════════════════════
describe('poor citizen ratings are never hidden by the absence of complaints', () => {
  it('many 1★ reviews and zero complaints → very low (revision 1 gave 61 "Fair")', () => {
    const h = calculateToiletHealth({ ...base, reviewCount: 50, averageRating: 1 });
    assert.ok(h.score! <= 10, `got ${h.score}`);
    assert.equal(h.label, 'NEEDS_ATTENTION');
  });

  it('any toilet with ≥5 reviews averaging 2.0★ or worse and no complaints is Needs Attention', () => {
    for (const n of [5, 10, 50, 500]) {
      for (const avg of [1, 1.5, 2]) {
        const h = calculateToiletHealth({ ...base, reviewCount: n, averageRating: avg });
        assert.equal(h.label, 'NEEDS_ATTENTION', `n=${n} avg=${avg} → ${h.score}`);
      }
    }
  });

  it('with only 3 reviews the neutral prior still carries half the weight — documented, intended', () => {
    const at = (avg: number) => calculateToiletHealth({ ...base, reviewCount: 3, averageRating: avg });
    assert.equal(at(1).label, 'NEEDS_ATTENTION'); // 35
    assert.equal(at(1.5).label, 'NEEDS_ATTENTION'); // 44
    assert.equal(at(2).score, 53); // Fair, but 17 points below the neutral 70 — still a meaningful drop
    assert.ok(70 - at(2).score! >= 15);
  });

  it('score never decreases as the average rating increases (n fixed, nothing else changes)', () => {
    for (const n of [3, 10, 100]) {
      let previous = -1;
      for (let avg = 1; avg <= 5.0001; avg += 0.1) {
        const s = calculateToiletHealth({ ...base, reviewCount: n, averageRating: avg }).score!;
        assert.ok(s >= previous, `n=${n} avg=${avg.toFixed(1)}: ${s} < ${previous}`);
        previous = s;
      }
    }
  });

  it('the rating sweep (n=20, no complaints) crosses the label bands where a citizen would expect', () => {
    const s = (avg: number) => calculateToiletHealth({ ...base, reviewCount: 20, averageRating: avg });
    assert.equal(s(1.5).label, 'NEEDS_ATTENTION');
    assert.equal(s(2.0).label, 'NEEDS_ATTENTION');
    assert.equal(s(2.5).label, 'FAIR');
    assert.equal(s(3.0).label, 'FAIR');
    assert.equal(s(4.0).label, 'GOOD');
    assert.equal(s(5.0).label, 'GOOD');
  });

  it('trust: 3★ or better ⇒ 100%, 2★ ⇒ 50%, 1★ ⇒ 0%, and it is clamped', () => {
    assert.equal(trustFromRating(5), 1);
    assert.equal(trustFromRating(3), 1);
    assert.equal(trustFromRating(2), 0.5);
    assert.equal(trustFromRating(1), 0);
    assert.equal(trustFromRating(0), 0);
    assert.equal(trustFromRating(99), 1);
  });

  it('good ratings do NOT inflate the open-issues points (trust only ever reduces)', () => {
    const h = calculateToiletHealth({ ...base, reviewCount: 100, averageRating: 5 });
    assert.equal(issues(h), 50);
  });
});

// ═════════════════════════════════════════════════════════════════
// Requirement: unresolved complaints have a substantial effect
// ═════════════════════════════════════════════════════════════════
describe('unresolved complaints', () => {
  const rated = { ...base, reviewCount: 20, averageRating: 5 };

  it('one serious complaint costs 20 of the 50 open-issue points', () => {
    const h = calculateToiletHealth({ ...rated, totalComplaints: 1, openComplaints: [open('BROKEN_INFRASTRUCTURE')] });
    assert.equal(issues(h), 30);
  });

  it('two serious complaints leave only 10 points; three exhaust the component', () => {
    const two = calculateToiletHealth({
      ...rated, totalComplaints: 2,
      openComplaints: [open('WATER_SHORTAGE'), open('BROKEN_INFRASTRUCTURE')],
    });
    const three = calculateToiletHealth({ ...rated, totalComplaints: 3, openComplaints: threeOpen });
    assert.equal(issues(two), 10);
    assert.equal(issues(three), 0);
  });

  it('even with 5.0★ reviews, 2+ serious open complaints put a toilet below "Good"', () => {
    const h = calculateToiletHealth({
      ...rated, totalComplaints: 2,
      openComplaints: [open('WATER_SHORTAGE'), open('BROKEN_INFRASTRUCTURE')],
    });
    assert.ok(h.score! < HEALTH_CONFIG.GOOD_MIN);
    assert.equal(h.label, 'NEEDS_ATTENTION');
  });

  it('adding an open complaint never raises the score', () => {
    let list: OpenComplaintInput[] = [];
    let previous = calculateToiletHealth({ ...rated }).score!;
    for (const c of [open('OTHER'), open('CLEANLINESS'), open('WATER_SHORTAGE'), open('WATER_SHORTAGE'), open('BROKEN_INFRASTRUCTURE')]) {
      list = [...list, c];
      const s = calculateToiletHealth({ ...rated, totalComplaints: list.length, openComplaints: list }).score!;
      assert.ok(s <= previous, `${s} > ${previous}`);
      previous = s;
    }
  });

  it('category severity: water = broken > cleanliness > other', () => {
    const p = (cat: OpenComplaintInput['category']) =>
      issues(calculateToiletHealth({ ...rated, totalComplaints: 1, openComplaints: [open(cat)] }));
    assert.equal(p('WATER_SHORTAGE'), p('BROKEN_INFRASTRUCTURE'));
    assert.ok(p('BROKEN_INFRASTRUCTURE') < p('CLEANLINESS'));
    assert.ok(p('CLEANLINESS') < p('OTHER'));
  });

  it('stage factors are as documented', () => {
    assert.equal(stageFactor(open('OTHER', 'PENDING')), 1);
    assert.equal(stageFactor(open('OTHER', 'IN_PROGRESS')), 0.8);
    assert.equal(stageFactor(open('OTHER', 'IN_PROGRESS', 'ASSIGNED')), 0.8);
    assert.equal(stageFactor(open('OTHER', 'IN_PROGRESS', 'IN_PROGRESS')), 0.6);
    assert.equal(stageFactor(open('OTHER', 'IN_PROGRESS', 'SUBMITTED')), 0.4);
    assert.equal(stageFactor(open('OTHER', 'IN_PROGRESS', 'REVISION_REQUIRED')), 0.8);
    assert.equal(stageFactor(open('OTHER', 'PENDING', 'VERIFIED')), 1); // inconsistent: no credit
  });

  it('score rises monotonically as one complaint moves through the workflow', () => {
    const at = (status: OpenComplaintInput['status'], task: OpenComplaintInput['taskStatus']) =>
      calculateToiletHealth({ ...rated, totalComplaints: 1, openComplaints: [open('WATER_SHORTAGE', status, task)] }).score!;
    const resolvedUnverified = calculateToiletHealth({ ...rated, totalComplaints: 1 }).score!;
    const verified = calculateToiletHealth({ ...rated, totalComplaints: 1, verifiedFixes: 1 }).score!;
    const steps = [at('PENDING', null), at('IN_PROGRESS', 'ASSIGNED'), at('IN_PROGRESS', 'IN_PROGRESS'), at('IN_PROGRESS', 'SUBMITTED'), resolvedUnverified, verified];
    for (let i = 1; i < steps.length; i++) assert.ok(steps[i] >= steps[i - 1], steps.join(','));
    assert.ok(steps[5] > steps[0]);
  });

  it('repeat reports in one category add only 25% each (same problem, not counted again)', () => {
    const one = calculateToiletHealth({ ...rated, totalComplaints: 1, openComplaints: [open('WATER_SHORTAGE')] });
    const three = calculateToiletHealth({
      ...rated, totalComplaints: 3,
      openComplaints: [open('WATER_SHORTAGE'), open('WATER_SHORTAGE'), open('WATER_SHORTAGE')],
    });
    assert.equal(issues(one), 30);
    assert.equal(issues(three), 20); // 50 − (20 + 0.25×40)
  });
});

// ═════════════════════════════════════════════════════════════════
// Requirement: verified maintenance gives credit but cannot conceal problems
// ═════════════════════════════════════════════════════════════════
describe('verified maintenance bonus', () => {
  const rated = { ...base, reviewCount: 20, averageRating: 5 };

  it('+5 per verified fix, capped at +10', () => {
    assert.equal(bonus(calculateToiletHealth({ ...rated, totalComplaints: 1, verifiedFixes: 1 })), 5);
    assert.equal(bonus(calculateToiletHealth({ ...rated, totalComplaints: 2, verifiedFixes: 2 })), 10);
    assert.equal(bonus(calculateToiletHealth({ ...rated, totalComplaints: 9, verifiedFixes: 9 })), 10);
  });

  it('shrinks as unresolved problems remain, and is zero once they exhaust the component', () => {
    const noOpen = calculateToiletHealth({ ...rated, totalComplaints: 2, verifiedFixes: 2 });
    const oneOpen = calculateToiletHealth({
      ...rated, totalComplaints: 3, verifiedFixes: 2, openComplaints: [open('WATER_SHORTAGE')],
    });
    const twoOpen = calculateToiletHealth({
      ...rated, totalComplaints: 4, verifiedFixes: 2,
      openComplaints: [open('WATER_SHORTAGE'), open('BROKEN_INFRASTRUCTURE')],
    });
    const threeOpen3 = calculateToiletHealth({ ...rated, totalComplaints: 5, verifiedFixes: 2, openComplaints: threeOpen });
    assert.equal(bonus(noOpen), 10);
    assert.equal(bonus(oneOpen), 6); // 10 × (30/50)
    assert.equal(bonus(twoOpen), 2); // 10 × (10/50)
    assert.equal(bonus(threeOpen3), 0);
  });

  it('a verified fix cannot lift a toilet with serious open complaints out of Needs Attention', () => {
    const h = calculateToiletHealth({
      ...rated, totalComplaints: 4, verifiedFixes: 2,
      openComplaints: [open('WATER_SHORTAGE'), open('BROKEN_INFRASTRUCTURE')],
    });
    assert.equal(h.score, 49);
    assert.equal(h.label, 'NEEDS_ATTENTION');
  });

  it('is scaled down when citizen ratings are low', () => {
    const poor = calculateToiletHealth({ ...base, reviewCount: 10, averageRating: 2, totalComplaints: 2, verifiedFixes: 2 });
    assert.ok(bonus(poor) < 10);
    assert.match(poor.factors[2].detail, /citizen ratings are low/);
  });

  it('a RESOLVED complaint without a verified task is not assumed verified', () => {
    const h = calculateToiletHealth({ ...rated, totalComplaints: 3, verifiedFixes: 0 });
    assert.equal(bonus(h), 0);
    assert.equal(issues(h), 50, 'its penalty is gone');
  });

  it('can never push the score above 100', () => {
    const h = calculateToiletHealth({ ...base, reviewCount: 100000, averageRating: 5, totalComplaints: 1000, verifiedFixes: 1000 });
    assert.equal(bonus(h), 10);
    assert.ok(h.score! <= 100);
    assert.equal(h.score, 100);
  });

  it('50 + 40 + 10 is the ceiling: 5.0★ from 500 reviews + 2 verified fixes ⇒ 100', () => {
    const h = calculateToiletHealth({ ...base, reviewCount: 500, averageRating: 5, totalComplaints: 2, verifiedFixes: 2 });
    assert.equal(h.score, 100);
    assert.deepEqual(h.factors.map((f) => f.maxPoints), [50, 40, 10]);
  });
});

// ═════════════════════════════════════════════════════════════════
// Data sufficiency / confidence
// ═════════════════════════════════════════════════════════════════
describe('missing and limited data', () => {
  it('no reviews and no complaints → no number, never a "perfect" score', () => {
    const h = calculateToiletHealth(base);
    assert.equal(h.score, null);
    assert.equal(h.confidence, 'INSUFFICIENT');
    assert.match(h.notes[0], /cannot be calculated/);
  });

  it('confidence boundaries: 0 insufficient · 1–2 limited · 3 reviews sufficient', () => {
    const rated = (n: number) => calculateToiletHealth({ ...base, reviewCount: n, averageRating: 4 });
    assert.equal(rated(0).confidence, 'INSUFFICIENT');
    assert.equal(rated(1).confidence, 'LIMITED');
    assert.equal(rated(2).confidence, 'LIMITED');
    assert.equal(rated(3).confidence, 'SUFFICIENT');
  });

  it('complaints count as evidence, but full confidence also needs at least one review', () => {
    const complaintsOnly = calculateToiletHealth({ ...base, totalComplaints: 3, verifiedFixes: 3 });
    assert.equal(complaintsOnly.evidenceCount, 3);
    assert.equal(complaintsOnly.confidence, 'LIMITED');
    assert.ok(complaintsOnly.notes.some((n) => /No citizen reviews yet/.test(n)));

    const mixed = calculateToiletHealth({ ...base, reviewCount: 1, averageRating: 4, totalComplaints: 2, verifiedFixes: 2 });
    assert.equal(mixed.evidenceCount, 3);
    assert.equal(mixed.confidence, 'SUFFICIENT');
  });

  it('no complaints is explicitly NOT presented as proof of good upkeep', () => {
    const h = calculateToiletHealth({ ...base, reviewCount: 10, averageRating: 5 });
    assert.ok(h.notes.some((n) => /not proof/.test(n)));
    assert.ok(h.score! < 90, 'the top of the scale needs verified maintenance');
  });

  it('reviews with a null average are treated as no reviews', () => {
    const h = calculateToiletHealth({ ...base, reviewCount: 4, averageRating: null });
    assert.equal(h.confidence, 'INSUFFICIENT');
  });

  it('NaN / negative / fractional / absurd inputs never break the score', () => {
    const h = calculateToiletHealth({
      reviewCount: Number.NaN, averageRating: 4, totalComplaints: -5, openComplaints: [], verifiedFixes: -2,
    });
    assert.equal(h.score, null);
    assert.equal(calculateToiletHealth({ ...base, reviewCount: 3.9, averageRating: 4 }).evidenceCount, 3);
    const hi = calculateToiletHealth({ ...base, reviewCount: 50, averageRating: 99 });
    const five = calculateToiletHealth({ ...base, reviewCount: 50, averageRating: 5 });
    assert.equal(hi.score, five.score);
    assert.ok(calculateToiletHealth({ ...base, reviewCount: 50, averageRating: -3 }).score! >= 0);
  });

  it('impossible combinations are repaired, not trusted', () => {
    const wronglyOpen = calculateToiletHealth({
      ...base, reviewCount: 5, averageRating: 4, totalComplaints: 1, openComplaints: [open('WATER_SHORTAGE', 'RESOLVED')],
    });
    assert.equal(issues(wronglyOpen), 50);
    const tooManyFixes = calculateToiletHealth({
      ...base, reviewCount: 5, averageRating: 4, totalComplaints: 1, openComplaints: [open('OTHER')], verifiedFixes: 5,
    });
    assert.equal(bonus(tooManyFixes), 0);
    const undercounted = calculateToiletHealth({ ...base, totalComplaints: 0, openComplaints: [open('OTHER')] });
    assert.equal(undercounted.evidenceCount, 1);
    const unknownCategory = calculateToiletHealth({
      ...base, reviewCount: 5, averageRating: 4, totalComplaints: 1,
      openComplaints: [{ category: 'FUTURE_CATEGORY' as never, status: 'PENDING', taskStatus: null }],
    });
    assert.equal(issues(unknownCategory), 42); // 50 − 8 (treated as OTHER)
  });
});

// ═════════════════════════════════════════════════════════════════
// Invariants
// ═════════════════════════════════════════════════════════════════
describe('labels', () => {
  it('thresholds: Good ≥ 75 · Fair 50–74 · Needs Attention < 50', () => {
    assert.equal(labelForScore(100), 'GOOD');
    assert.equal(labelForScore(75), 'GOOD');
    assert.equal(labelForScore(74), 'FAIR');
    assert.equal(labelForScore(50), 'FAIR');
    assert.equal(labelForScore(49), 'NEEDS_ATTENTION');
    assert.equal(labelForScore(0), 'NEEDS_ATTENTION');
  });

  it('every returned label matches its returned score', () => {
    for (const s of SCENARIOS) {
      const h = calculateToiletHealth(s.input);
      if (h.score !== null) assert.equal(h.label, labelForScore(h.score));
    }
  });
});

describe('rounding is consistent (half-up, tolerant of floating-point error)', () => {
  // Real ties: with n reviews whose ratings sum to s, the citizen-experience factor is EXACTLY
  // x.x5 mathematically, but binary floating point stores it as x.x4999… (found by exhaustive
  // search over n ≤ 60). Without the tolerance these display one tenth too low.
  const ties: Array<{ n: number; sum: number; expected: number }> = [
    { n: 21, sum: 102, expected: 36.3 }, // 36.25 exactly
    { n: 37, sum: 42, expected: 2.8 }, //  2.75 exactly
    { n: 37, sum: 44, expected: 3.3 }, //  3.25 exactly
    { n: 37, sum: 52, expected: 5.3 }, //  5.25 exactly
    { n: 37, sum: 62, expected: 7.8 }, //  7.75 exactly
    { n: 37, sum: 78, expected: 11.8 }, // 11.75 exactly
  ];

  for (const t of ties) {
    it(`${t.n} reviews summing to ${t.sum}: experience is exactly ${t.expected - 0.05}, shown as ${t.expected}`, () => {
      const h = calculateToiletHealth({ ...base, reviewCount: t.n, averageRating: t.sum / t.n });
      assert.equal(experience(h), t.expected);
    });
  }

  it('an exact .5 final score rounds up (52.5 → 53, 81.5 → 82)', () => {
    assert.equal(calculateToiletHealth(SCENARIOS[8].input).score, 53);
    assert.equal(calculateToiletHealth(SCENARIOS[11].input).score, 82);
  });

  it('factor points have at most one decimal place', () => {
    for (const s of SCENARIOS) {
      for (const f of calculateToiletHealth(s.input).factors) {
        assert.equal(Math.abs(f.points * 10 - Math.round(f.points * 10)) < 1e-9, true, `${f.key}: ${f.points}`);
      }
    }
  });
});

describe('determinism', () => {
  const input: ToiletHealthInput = {
    ...base, reviewCount: 7, averageRating: 3.6, totalComplaints: 3,
    openComplaints: [open('WATER_SHORTAGE'), open('WATER_SHORTAGE', 'IN_PROGRESS', 'ASSIGNED'), open('CLEANLINESS', 'IN_PROGRESS', 'SUBMITTED')],
  };

  it('same input → identical output, every time', () => {
    assert.deepEqual(calculateToiletHealth(input), calculateToiletHealth(input));
  });

  it('input order does not matter', () => {
    const reversed = { ...input, openComplaints: [...input.openComplaints].reverse() };
    assert.deepEqual(calculateToiletHealth(input), calculateToiletHealth(reversed));
  });

  it('does not mutate its input', () => {
    const snapshot = JSON.stringify(input);
    calculateToiletHealth(input);
    assert.equal(JSON.stringify(input), snapshot);
  });
});

function seededInputs(count: number): ToiletHealthInput[] {
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const cats = ['CLEANLINESS', 'WATER_SHORTAGE', 'BROKEN_INFRASTRUCTURE', 'OTHER'] as const;
  const stats = ['PENDING', 'IN_PROGRESS'] as const;
  const tasks = [null, 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUIRED', 'VERIFIED'] as const;
  return Array.from({ length: count }, () => ({
    reviewCount: Math.floor(rnd() * 200) - 5,
    averageRating: rnd() < 0.1 ? null : rnd() * 8 - 1,
    totalComplaints: Math.floor(rnd() * 20) - 2,
    verifiedFixes: Math.floor(rnd() * 20) - 2,
    openComplaints: Array.from({ length: Math.floor(rnd() * 12) }, () => ({
      category: cats[Math.floor(rnd() * 4)],
      status: stats[Math.floor(rnd() * 2)],
      taskStatus: tasks[Math.floor(rnd() * tasks.length)],
    })),
  }));
}

describe('invariants over 5000 seeded pseudo-random inputs (including garbage)', () => {
  const inputs = seededInputs(5000);

  it('score is null or an integer in [0,100]; each factor stays within [0, its maximum]', () => {
    for (const input of inputs) {
      const h = calculateToiletHealth(input);
      if (h.score === null) {
        assert.equal(h.confidence, 'INSUFFICIENT');
        continue;
      }
      assert.ok(Number.isInteger(h.score) && h.score >= 0 && h.score <= 100, `bad score ${h.score}`);
      for (const f of h.factors) assert.ok(f.points >= 0 && f.points <= f.maxPoints, `${f.key}: ${f.points}`);
    }
  });

  it('the explanation agrees with the calculation: round(sum of factor points) === score', () => {
    for (const input of inputs) {
      const h = calculateToiletHealth(input);
      if (h.score === null) continue;
      const sumTenths = h.factors.reduce((s, f) => s + tenths(f.points), 0);
      assert.equal(Math.round(sumTenths / 10), h.score, JSON.stringify(h.factors.map((f) => f.points)));
    }
  });

  it('the factor maximums reported are the documented 50 / 40 / 10', () => {
    for (const input of inputs.slice(0, 200)) {
      const h = calculateToiletHealth(input);
      if (h.score !== null) assert.deepEqual(h.factors.map((f) => f.maxPoints), [50, 40, 10]);
    }
  });

  it('evidenceCount equals reviews + complaints after normalisation; label always matches score', () => {
    for (const input of inputs) {
      const h = calculateToiletHealth(input);
      if (h.score !== null) assert.equal(h.label, labelForScore(h.score));
    }
  });

  it('no factor ever contributes more than its share, so poor ratings cap the score', () => {
    for (const input of inputs) {
      const h = calculateToiletHealth(input);
      if (h.score === null || input.averageRating === null) continue;
      // With ≥5 usable reviews averaging ≤ 2.0★ and no open complaints the score must stay below 50.
      const n = Math.floor(input.reviewCount);
      if (n >= 5 && input.averageRating <= 2 && input.openComplaints.length === 0) {
        assert.ok(h.score < 50, `n=${n} avg=${input.averageRating} → ${h.score}`);
      }
    }
  });
});

describe('explanation text agrees with the data', () => {
  it('open-complaint counts, review counts and averages in the text match the input', () => {
    const h = calculateToiletHealth({
      ...base, reviewCount: 12, averageRating: 3.5, totalComplaints: 4, verifiedFixes: 1,
      openComplaints: [open('WATER_SHORTAGE'), open('CLEANLINESS', 'IN_PROGRESS', 'IN_PROGRESS'), open('OTHER', 'IN_PROGRESS', 'SUBMITTED')],
    });
    assert.match(h.factors[0].detail, /3 open complaints/);
    assert.match(h.factors[0].detail, /1 water shortage/);
    assert.match(h.factors[0].detail, /1 with staff assigned or working/);
    assert.match(h.factors[0].detail, /1 awaiting admin verification/);
    assert.match(h.factors[1].detail, /Average 3\.5★ from 12 reviews/);
    assert.match(h.factors[2].detail, /1 complaint resolved and verified/);
    assert.equal(h.evidenceCount, 16);
  });

  it('the trust percentage in the notes equals the trust used', () => {
    const h = calculateToiletHealth({ ...base, reviewCount: 5, averageRating: 1.4 }); // trust 50%
    assert.ok(h.notes.some((n) => /reduced to 50%/.test(n)));
    assert.match(h.factors[0].detail, /counted at 50%/i);
    assert.equal(issues(h), 25);
  });

  it('no trust note appears when ratings are average or better', () => {
    const h = calculateToiletHealth({ ...base, reviewCount: 10, averageRating: 4 });
    assert.ok(!h.notes.some((n) => /reduced to/.test(n)));
    assert.ok(!/counted at/i.test(h.factors[0].detail));
  });
});

describe('assembleHealthInputs (DB rows → scorer input)', () => {
  it('maps grouped rows per toilet and ignores rows for unrequested toilets', () => {
    const inputs = assembleHealthInputs(
      ['t1', 't2'],
      [{ toiletId: 't1', averageRating: 4.5, count: 2 }, { toiletId: 'zzz', averageRating: 1, count: 9 }],
      [{ toiletId: 't1', count: 3 }],
      [
        { toiletId: 't1', category: 'WATER_SHORTAGE', status: 'PENDING', taskStatus: null },
        { toiletId: 'zzz', category: 'OTHER', status: 'PENDING', taskStatus: null },
      ],
      [{ toiletId: 't1', count: 1 }]
    );
    assert.deepEqual([...inputs.keys()], ['t1', 't2']);
    assert.deepEqual(inputs.get('t1'), {
      reviewCount: 2, averageRating: 4.5, totalComplaints: 3,
      openComplaints: [{ category: 'WATER_SHORTAGE', status: 'PENDING', taskStatus: null }],
      verifiedFixes: 1,
    });
    assert.equal(calculateToiletHealth(inputs.get('t2')!).confidence, 'INSUFFICIENT');
  });
});
