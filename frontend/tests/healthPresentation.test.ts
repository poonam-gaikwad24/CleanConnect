// Run (from frontend/):  npx tsx --test tests/healthPresentation.test.ts
//
// Unit tests for the pure helpers behind the health card. The FIXTURES below are
// real output of the backend scoring function (generated, not hand-typed), so the
// insight logic is tested against exactly what the API returns.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { HealthFactor, ToiletHealth } from '../src/api/toiletHealth';
import {
  buildHealthInsight,
  factorRatio,
  HEALTH_BANDS,
  toneForRatio,
} from '../src/utils/healthPresentation';

const FIXTURES: Record<string, ToiletHealth> = {
  highNoOpen: {
    score: 87, label: 'GOOD', confidence: 'SUFFICIENT', evidenceCount: 20,
    factors: [
      { key: 'OPEN_ISSUES', label: 'Open issues', points: 50, maxPoints: 50, detail: "No open complaints." },
      { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 37.4, maxPoints: 40, detail: "Average 5.0★ from 20 reviews." },
      { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: "No admin-verified fixes recorded yet." },
    ],
    notes: ["No complaints have been recorded. That is not proof the toilet is well maintained, so the top of the scale is reserved for toilets with verified maintenance."],
  },
  highWithOpen: {
    score: 37, label: 'NEEDS_ATTENTION', confidence: 'SUFFICIENT', evidenceCount: 23,
    factors: [
      { key: 'OPEN_ISSUES', label: 'Open issues', points: 0, maxPoints: 50, detail: "3 open complaints: 1 broken infrastructure, 1 cleanliness, 1 water shortage." },
      { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 37.4, maxPoints: 40, detail: "Average 5.0★ from 20 reviews." },
      { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: "No admin-verified fixes recorded yet." },
    ],
    notes: [],
  },
  lowWithOpen: {
    score: 7, label: 'NEEDS_ATTENTION', confidence: 'SUFFICIENT', evidenceCount: 23,
    factors: [
      { key: 'OPEN_ISSUES', label: 'Open issues', points: 0, maxPoints: 50, detail: "3 open complaints: 1 broken infrastructure, 1 cleanliness, 1 water shortage. Credit counted at 35% because citizen ratings are low." },
      { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 7, maxPoints: 40, detail: "Average 1.5★ from 20 reviews." },
      { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: "No admin-verified fixes recorded yet." },
    ],
    notes: ["Citizen ratings are below average, so credit for having no open complaints and for past fixes is reduced to 35%."],
  },
  veryLowNoOpen: {
    score: 4, label: 'NEEDS_ATTENTION', confidence: 'SUFFICIENT', evidenceCount: 50,
    factors: [
      { key: 'OPEN_ISSUES', label: 'Open issues', points: 2.8, maxPoints: 50, detail: "No open complaints. Credit counted at 6% because citizen ratings are low." },
      { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 1.1, maxPoints: 40, detail: "Average 1.0★ from 50 reviews." },
      { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: "No admin-verified fixes recorded yet." },
    ],
    notes: ["Citizen ratings are below average, so credit for having no open complaints and for past fixes is reduced to 6%.", "No complaints have been recorded. That is not proof the toilet is well maintained, so the top of the scale is reserved for toilets with verified maintenance."],
  },
  neutralNoOpen: {
    score: 70, label: 'FAIR', confidence: 'SUFFICIENT', evidenceCount: 20,
    factors: [
      { key: 'OPEN_ISSUES', label: 'Open issues', points: 50, maxPoints: 50, detail: "No open complaints." },
      { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 20, maxPoints: 40, detail: "Average 3.0★ from 20 reviews." },
      { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: "No admin-verified fixes recorded yet." },
    ],
    notes: ["No complaints have been recorded. That is not proof the toilet is well maintained, so the top of the scale is reserved for toilets with verified maintenance."],
  },
  neutralWithOpen: {
    score: 50, label: 'FAIR', confidence: 'SUFFICIENT', evidenceCount: 21,
    factors: [
      { key: 'OPEN_ISSUES', label: 'Open issues', points: 30, maxPoints: 50, detail: "1 open complaint: 1 water shortage." },
      { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 20, maxPoints: 40, detail: "Average 3.0★ from 20 reviews." },
      { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: "No admin-verified fixes recorded yet." },
    ],
    notes: [],
  },
  belowAvgNoOpen: {
    score: 55, label: 'FAIR', confidence: 'SUFFICIENT', evidenceCount: 20,
    factors: [
      { key: 'OPEN_ISSUES', label: 'Open issues', points: 39.1, maxPoints: 50, detail: "No open complaints. Credit counted at 78% because citizen ratings are low." },
      { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 15.7, maxPoints: 40, detail: "Average 2.5★ from 20 reviews." },
      { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: "No admin-verified fixes recorded yet." },
    ],
    notes: ["Citizen ratings are below average, so credit for having no open complaints and for past fixes is reduced to 78%.", "No complaints have been recorded. That is not proof the toilet is well maintained, so the top of the scale is reserved for toilets with verified maintenance."],
  },
  cc0001: {
    score: 44, label: 'NEEDS_ATTENTION', confidence: 'SUFFICIENT', evidenceCount: 4,
    factors: [
      { key: 'OPEN_ISSUES', label: 'Open issues', points: 29.2, maxPoints: 50, detail: "No open complaints. Credit counted at 58% because citizen ratings are low." },
      { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 11.7, maxPoints: 40, detail: "Average 1.3★ from 3 reviews. With few reviews, the average is weighted toward neutral." },
      { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 2.9, maxPoints: 10, detail: "1 complaint resolved and verified by an admin. Counted at 58% because citizen ratings are low." },
    ],
    notes: ["Citizen ratings are below average, so credit for having no open complaints and for past fixes is reduced to 58%."],
  },
  noReviewsOneOpen: {
    score: 62, label: 'FAIR', confidence: 'LIMITED', evidenceCount: 1,
    factors: [
      { key: 'OPEN_ISSUES', label: 'Open issues', points: 42, maxPoints: 50, detail: "1 open complaint: 1 other." },
      { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 20, maxPoints: 40, detail: "No reviews yet — a neutral value is used until citizens rate this toilet." },
      { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: "No admin-verified fixes recorded yet." },
    ],
    notes: ["Based on limited information (1 record). Treat this score as a rough estimate.", "No citizen reviews yet, so this estimate rests on complaint records only."],
  },
} as Record<string, ToiletHealth>;

const insight = (k: keyof typeof FIXTURES) => buildHealthInsight(FIXTURES[k as string]);

describe('buildHealthInsight — each sentence is chosen from the actual factor values', () => {
  it('low ratings, nothing open → the CC-PMC-0001 sentence', () => {
    assert.equal(insight('cc0001'), 'Citizen ratings are low, although no complaints are currently open.');
  });

  it('high ratings, nothing open', () => {
    assert.equal(insight('highNoOpen'), 'Citizen ratings are high and no complaints are currently open.');
  });

  it('high ratings but open complaints', () => {
    assert.equal(
      insight('highWithOpen'),
      'Citizen ratings are high, but unresolved complaints are lowering this score.'
    );
  });

  it('low ratings AND open complaints', () => {
    assert.equal(
      insight('lowWithOpen'),
      'Citizen ratings are low, and unresolved complaints are also lowering this score.'
    );
  });

  it('below-average (not "low") ratings, nothing open', () => {
    assert.equal(
      insight('belowAvgNoOpen'),
      'Citizen ratings are below average, although no complaints are currently open.'
    );
  });

  it('neutral ratings, nothing open → only the open-complaints fact', () => {
    assert.equal(insight('neutralNoOpen'), 'No complaints are currently open.');
  });

  it('neutral ratings with an open complaint', () => {
    assert.equal(insight('neutralWithOpen'), 'Unresolved complaints are lowering this score.');
  });

  it('no reviews yet (neutral) with one open complaint → talks about the complaint, never about ratings', () => {
    assert.equal(insight('noReviewsOneOpen'), 'Unresolved complaints are lowering this score.');
  });

  it('when ratings are so low that the numbers cannot tell whether complaints are open, it says nothing about complaints', () => {
    assert.equal(insight('veryLowNoOpen'), 'Citizen ratings are low, which is lowering this score.');
    assert.doesNotMatch(insight('veryLowNoOpen')!, /complaint/);
  });

  it('is not one fixed message: the fixtures produce several different sentences', () => {
    const all = Object.keys(FIXTURES).map((k) => insight(k as string));
    assert.ok(new Set(all).size >= 6, `only ${new Set(all).size} distinct`);
  });
});

describe('buildHealthInsight — stays silent when the data does not support a statement', () => {
  const withScore = FIXTURES.cc0001;

  it('no score (insufficient data) → no insight', () => {
    assert.equal(
      buildHealthInsight({ score: null, label: null, confidence: 'INSUFFICIENT', evidenceCount: 0, factors: [], notes: [] }),
      null
    );
  });

  it('missing factors → no insight (never guesses)', () => {
    assert.equal(buildHealthInsight({ ...withScore, factors: [] }), null);
    assert.equal(buildHealthInsight({ ...withScore, factors: [withScore.factors[0]] }), null);
  });

  it('a factor with a zero maximum → no insight (no division by zero)', () => {
    const broken = withScore.factors.map((f: HealthFactor) => ({ ...f, maxPoints: 0 }));
    assert.equal(buildHealthInsight({ ...withScore, factors: broken }), null);
  });

  it('never claims things about ratings when there are none (neutral 20/40)', () => {
    assert.doesNotMatch(insight('noReviewsOneOpen')!, /ratings/);
  });

  it('the sentence follows the data: change the points and the sentence changes', () => {
    const high = {
      ...withScore,
      factors: [
        { ...withScore.factors[0], points: 50 },
        { ...withScore.factors[1], points: 38 },
        withScore.factors[2],
      ],
    };
    assert.equal(buildHealthInsight(high), 'Citizen ratings are high and no complaints are currently open.');
  });
});

describe('toneForRatio / factorRatio', () => {
  it('uses the same cut-offs as the overall bands (75% and 50%)', () => {
    assert.equal(HEALTH_BANDS.GOOD_MIN, 75);
    assert.equal(HEALTH_BANDS.FAIR_MIN, 50);
    assert.equal(toneForRatio(1), 'good');
    assert.equal(toneForRatio(0.75), 'good');
    assert.equal(toneForRatio(0.7499), 'fair');
    assert.equal(toneForRatio(0.5), 'fair');
    assert.equal(toneForRatio(0.4999), 'attention');
    assert.equal(toneForRatio(0), 'attention');
  });

  it('factorRatio is points ÷ max, clamped to 0–1, and safe for a zero maximum', () => {
    const f = (points: number, maxPoints: number): HealthFactor => ({
      key: 'OPEN_ISSUES', label: 'x', points, maxPoints, detail: '',
    });
    assert.equal(factorRatio(f(25, 50)), 0.5);
    assert.equal(factorRatio(f(60, 50)), 1);
    assert.equal(factorRatio(f(-5, 50)), 0);
    assert.equal(factorRatio(f(5, 0)), 0);
  });
});
