// Run (from frontend/):  npx tsx --test tests/toiletHealthView.test.tsx
//
// Renders the real presentational components to HTML with React's own
// server renderer and asserts on the markup. No browser, no DOM library,
// no network, no new dependency (tsx is only the TypeScript runner).
// What this does NOT cover: click handlers and effects (fetching,
// retry). Those are covered by the manual checklist in the handover.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
// tsconfig.json only covers src/, so tsx compiles this file with the classic JSX
// transform and needs React in scope here (the components in src/ are unaffected).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ToiletHealth } from '../src/api/toiletHealth';
import ToiletHealthView, { ToiletHealthBadge } from '../src/components/ToiletHealthView';
import { canDeleteReview } from '../src/utils/reviewPermissions';

const good: ToiletHealth = {
  score: 87,
  label: 'GOOD',
  confidence: 'SUFFICIENT',
  evidenceCount: 20,
  factors: [
    { key: 'OPEN_ISSUES', label: 'Open issues', points: 50, maxPoints: 50, detail: 'No open complaints.' },
    { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 37.4, maxPoints: 40, detail: 'Average 5.0★ from 20 reviews.' },
    { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: 'No admin-verified fixes recorded yet.' },
  ],
  notes: [],
};

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('ToiletHealthView', () => {
  it('loading state: accessible status message, no score', () => {
    const html = render(<ToiletHealthView state={{ status: 'loading' }} />);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /Loading health score/);
    assert.doesNotMatch(html, /progressbar/);
  });

  it('error state: alert with message and a retry button when onRetry is given', () => {
    const html = render(
      <ToiletHealthView state={{ status: 'error', message: 'Could not load the health score.' }} onRetry={() => undefined} />
    );
    assert.match(html, /role="alert"/);
    assert.match(html, /Could not load the health score\./);
    assert.match(html, /Try again/);
    assert.doesNotMatch(render(<ToiletHealthView state={{ status: 'error', message: 'x' }} />), /Try again/);
  });

  it('normal state: score out of 100, label text, progress bar, factor breakdown', () => {
    const html = render(<ToiletHealthView state={{ status: 'ready', health: good }} />);
    assert.match(html, />87</);
    assert.match(html, /\/ 100/);
    assert.match(html, /aria-label="Health score 87 out of 100"/);
    assert.match(html, />Good</);
    assert.match(html, /role="progressbar"/);
    assert.match(html, /aria-valuenow="87"/);
    assert.match(html, /aria-valuemin="0"/);
    assert.match(html, /aria-valuemax="100"/);
    assert.match(html, /width:87%/);
    assert.match(html, /What raised or lowered this score/);
    assert.match(html, /Open issues/);
    assert.match(html, /50 \/ 50/);
    assert.match(html, /37\.4 \/ 40/);
    assert.match(html, /Based on 20 records/);
    assert.match(html, /No open complaints\./);
    assert.match(html, /How is this calculated\?/);
  });

  it('states that the health score is separate from the star rating', () => {
    const html = render(<ToiletHealthView state={{ status: 'ready', health: good }} />);
    assert.match(html, /separate from the star rating/);
  });

  it('describes the score as an estimate, not an inspection, and separate from the star rating', () => {
    const html = render(<ToiletHealthView state={{ status: 'ready', health: good }} />);
    assert.match(html, /An estimate based on the reviews, complaints and admin-verified maintenance records/);
    assert.match(html, /not an inspection/);
    assert.match(html, /which only reflects citizens&#x27; opinions|which only reflects citizens&apos; opinions/);
  });

  it('the calculation help states the 50 / 40 / 10 split and the thresholds', () => {
    const html = render(<ToiletHealthView state={{ status: 'ready', health: good }} />);
    assert.match(html, /Open issues \(up to 50\)/);
    assert.match(html, /Citizen experience \(up to 40\)/);
    assert.match(html, /Verified maintenance \(up to 10\)/);
    assert.match(html, /Good is 75 or more, Fair is 50–74, Needs Attention is below 50/);
    assert.match(html, /unhappy people do not always file a complaint/);
  });

  it('low-rating state: the note explaining the reduced credit is shown to the user', () => {
    const lowRated: ToiletHealth = {
      score: 44,
      label: 'NEEDS_ATTENTION',
      confidence: 'SUFFICIENT',
      evidenceCount: 4,
      factors: [
        { key: 'OPEN_ISSUES', label: 'Open issues', points: 29.2, maxPoints: 50, detail: 'No open complaints. Credit counted at 58% because citizen ratings are low.' },
        { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 11.7, maxPoints: 40, detail: 'Average 1.3★ from 3 reviews. With few reviews, the average is weighted toward neutral.' },
        { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 2.9, maxPoints: 10, detail: '1 complaint resolved and verified by an admin. Counted at 58% because citizen ratings are low.' },
      ],
      notes: ['Citizen ratings are below average, so credit for having no open complaints and for past fixes is reduced to 58%.'],
    };
    const html = render(<ToiletHealthView state={{ status: 'ready', health: lowRated }} />);
    assert.match(html, />44</);
    assert.match(html, />Needs Attention</);
    assert.match(html, /reduced to 58%/);
    assert.match(html, /29\.2 \/ 50/);
    assert.match(html, /Counted at 58% because citizen ratings are low/);
    assert.match(html, /Based on 4 records/);
  });

  it('labels map to their documented text for each band', () => {
    const fair = render(<ToiletHealthView state={{ status: 'ready', health: { ...good, score: 60, label: 'FAIR' } }} />);
    const bad = render(
      <ToiletHealthView state={{ status: 'ready', health: { ...good, score: 33, label: 'NEEDS_ATTENTION' } }} />
    );
    assert.match(fair, />Fair</);
    assert.match(bad, />Needs Attention</);
  });

  it('limited-data state: score still shown but clearly flagged, in text not just colour', () => {
    const limited: ToiletHealth = {
      ...good,
      score: 79,
      confidence: 'LIMITED',
      evidenceCount: 1,
      notes: ['Based on limited information (1 record). Treat this score as a rough indication.'],
    };
    const html = render(<ToiletHealthView state={{ status: 'ready', health: limited }} />);
    assert.match(html, />79</);
    assert.match(html, /Good \(limited data\)/);
    assert.match(html, /limited information/);
  });

  it('insufficient-data state: no number, no bar, no fake precision', () => {
    const none: ToiletHealth = {
      score: null,
      label: null,
      confidence: 'INSUFFICIENT',
      evidenceCount: 0,
      factors: [],
      notes: ['No reviews or complaints have been recorded for this toilet yet, so a health score cannot be calculated.'],
    };
    const html = render(<ToiletHealthView state={{ status: 'ready', health: none }} />);
    assert.match(html, /Not enough data yet/);
    assert.match(html, /cannot be calculated/);
    assert.doesNotMatch(html, /progressbar/);
    assert.doesNotMatch(html, /\/ 100/);
  });

  it('renders text safely: HTML in a detail string is escaped, not injected', () => {
    const evil: ToiletHealth = {
      ...good,
      factors: [{ ...good.factors[0], detail: '<img src=x onerror=alert(1)>' }],
    };
    const html = render(<ToiletHealthView state={{ status: 'ready', health: evil }} />);
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;img src=x/);
  });
});

describe('ToiletHealthBadge (list rows)', () => {
  it('loading / error / ready / limited / insufficient', () => {
    assert.match(render(<ToiletHealthBadge state="loading" />), /Health score: loading/);
    assert.match(render(<ToiletHealthBadge state="loading" />), /aria-busy="true"/);
    assert.match(render(<ToiletHealthBadge state="error" />), /Health score unavailable/);
    assert.match(
      render(<ToiletHealthBadge state="ready" summary={{ score: 72, label: 'FAIR', confidence: 'SUFFICIENT', evidenceCount: 9 }} />),
      /Health 72\/100 · Fair/
    );
    assert.match(
      render(<ToiletHealthBadge state="ready" summary={{ score: 79, label: 'GOOD', confidence: 'LIMITED', evidenceCount: 1 }} />),
      /Good \(limited data\)/
    );
    assert.match(
      render(<ToiletHealthBadge state="ready" summary={{ score: null, label: null, confidence: 'INSUFFICIENT', evidenceCount: 0 }} />),
      /not enough data/
    );
  });
});

describe('canDeleteReview (which buttons the UI shows)', () => {
  it('CITIZEN: own only · ADMIN: any · STAFF: never · signed-out: never', () => {
    assert.equal(canDeleteReview({ id: 'a', role: 'CITIZEN' }, 'a'), true);
    assert.equal(canDeleteReview({ id: 'b', role: 'CITIZEN' }, 'a'), false);
    assert.equal(canDeleteReview({ id: 'x', role: 'ADMIN' }, 'a'), true);
    assert.equal(canDeleteReview({ id: 's', role: 'STAFF' }, 's'), false);
    assert.equal(canDeleteReview({ id: 's', role: 'STAFF' }, 'a'), false);
    assert.equal(canDeleteReview(null, 'a'), false);
    assert.equal(canDeleteReview(undefined, 'a'), false);
  });
});
