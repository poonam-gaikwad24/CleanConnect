// Run (from frontend/):  npx tsx --test tests/toiletHealthView.test.tsx
//
// Renders the real presentational components to HTML with React's own
// server renderer and asserts on the markup. No browser, no DOM library,
// no network, no new dependency (tsx is only the TypeScript runner).
// What this does NOT cover: real clicks on the expandable sections (the
// browser's native <details> handles those) and effects such as fetching
// and retry.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
// tsconfig.json only covers src/, so tsx compiles this file with the classic JSX
// transform and needs React in scope here (the components in src/ are unaffected).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ToiletHealth } from '../src/api/toiletHealth';
import Disclosure from '../src/components/Disclosure';
import ToiletHealthView, { ToiletHealthBadge } from '../src/components/ToiletHealthView';
import { canDeleteReview } from '../src/utils/reviewPermissions';

const render = (el: React.ReactElement) => renderToStaticMarkup(el);
// True only for a real `open` attribute on a <details> tag (not for classes like group-open:hidden).
const anyDetailsOpen = (html: string) => /<details\b[^>]*\sopen(?=[\s=>])/.test(html);
const ready = (health: ToiletHealth) => render(<ToiletHealthView state={{ status: 'ready', health }} />);

// ── fixtures ──────────────────────────────────────────────────────
// Real API output for CC-PMC-0001 (copied from the project owner's machine).
const cc0001: ToiletHealth = {
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

// A different toilet: 20 × 5★, nothing open → 50 + 37.4 + 0.
const wellRated: ToiletHealth = {
  score: 87,
  label: 'GOOD',
  confidence: 'SUFFICIENT',
  evidenceCount: 20,
  factors: [
    { key: 'OPEN_ISSUES', label: 'Open issues', points: 50, maxPoints: 50, detail: 'No open complaints.' },
    { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 37.4, maxPoints: 40, detail: 'Average 5.0★ from 20 reviews.' },
    { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: 'No admin-verified fixes recorded yet.' },
  ],
  notes: ['No complaints have been recorded. That is not proof the toilet is well maintained, so the top of the scale is reserved for toilets with verified maintenance.'],
};

const limited: ToiletHealth = {
  score: 75,
  label: 'GOOD',
  confidence: 'LIMITED',
  evidenceCount: 1,
  factors: [
    { key: 'OPEN_ISSUES', label: 'Open issues', points: 50, maxPoints: 50, detail: 'No open complaints.' },
    { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 25, maxPoints: 40, detail: 'Average 5.0★ from 1 review. With few reviews, the average is weighted toward neutral.' },
    { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 0, maxPoints: 10, detail: 'No admin-verified fixes recorded yet.' },
  ],
  notes: ['Based on limited information (1 record). Treat this score as a rough estimate.'],
};

const insufficient: ToiletHealth = {
  score: null,
  label: null,
  confidence: 'INSUFFICIENT',
  evidenceCount: 0,
  factors: [],
  notes: ['No reviews or complaints have been recorded for this toilet yet, so a health score cannot be calculated.'],
};

// ── loading / error ───────────────────────────────────────────────
describe('loading and error states', () => {
  it('loading: accessible status message and a skeleton that respects reduced motion', () => {
    const html = render(<ToiletHealthView state={{ status: 'loading' }} />);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /Loading health score/);
    assert.match(html, /class="[^"]*\banimate-pulse\b[^"]*"/);
    assert.match(html, /class="[^"]*\bmotion-reduce:animate-none\b[^"]*"/);
    assert.match(html, /<div aria-hidden="true" class="[^"]*animate-pulse/); // skeleton is hidden from screen readers
    assert.doesNotMatch(html, /progressbar/);
    assert.match(html, />Toilet Health Score</);
  });

  it('error: alert with the message and a shared-style retry button, only when onRetry is given', () => {
    const html = render(
      <ToiletHealthView state={{ status: 'error', message: 'Could not load the health score.' }} onRetry={() => undefined} />
    );
    assert.match(html, /role="alert"/);
    assert.match(html, /Could not load the health score\./);
    assert.match(html, /Try again/);
    assert.match(html, /class="btn btn-outline-danger mt-2"/);
    assert.doesNotMatch(render(<ToiletHealthView state={{ status: 'error', message: 'x' }} />), /Try again/);
  });
});

// ── A. visible by default ─────────────────────────────────────────
describe('health score card — visible by default (CC-PMC-0001, real API data)', () => {
  const html = ready(cc0001);

  it('shows the heading, score out of 100, and a status badge with text', () => {
    assert.match(html, /<h2[^>]*>Toilet Health Score<\/h2>/);
    assert.match(html, />44<span[^>]*>\/100<\/span>/);
    assert.match(html, /aria-label="Health score 44 out of 100"/);
    assert.match(html, />Needs Attention</);
  });

  it('the status badge has an icon, but the icon is decorative (text carries the meaning)', () => {
    const badge = html.slice(html.indexOf('rounded-full border px-3 py-1'), html.indexOf('Needs Attention'));
    assert.match(badge, /<svg aria-hidden="true"/);
  });

  it('has an accessible progress bar at the real score', () => {
    assert.match(html, /role="progressbar" aria-label="Toilet health score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="44"/);
    assert.match(html, /width:44%/);
  });

  it('shows the required short explanation', () => {
    assert.match(html, /Estimated condition based on citizen reviews, complaints, and verified maintenance records\./);
  });

  it('shows a dynamic insight that is true for this data', () => {
    assert.match(html, /Citizen ratings are low, although no complaints are currently open\./);
  });

  it('shows the evidence count and confidence in one compact line', () => {
    assert.match(html, /Based on 4 records · Sufficient evidence/);
  });

  it('keeps the concise disclaimer visible', () => {
    assert.match(
      html,
      /This is an estimate based on available records, not a physical inspection, and may not reflect current conditions\./
    );
  });

  it('does not put the factor numbers or the methodology in the default view — they are inside collapsed sections', () => {
    const visible = html.replace(/<details[\s\S]*?<\/details>/g, '');
    assert.doesNotMatch(visible, /29\.2\/50/);
    assert.doesNotMatch(visible, /11\.7\/40/);
    assert.doesNotMatch(visible, /Open Issues<\/strong>/);
    assert.doesNotMatch(visible, /reduced to 58%/);
  });
});

// ── B & C. expandable sections ────────────────────────────────────
describe('test helper sanity', () => {
  it('anyDetailsOpen distinguishes a real open attribute from group-open classes', () => {
    assert.equal(anyDetailsOpen('<details class="group group-open:x"><summary>a</summary></details>'), false);
    assert.equal(anyDetailsOpen('<details open class="group"><summary>a</summary></details>'), true);
    assert.equal(anyDetailsOpen('<details class="group" open=""><summary>a</summary></details>'), true);
  });
});

describe('expandable sections', () => {
  const html = ready(cc0001);

  it('there are exactly two, both collapsed by default (no open attribute)', () => {
    assert.equal((html.match(/<details/g) ?? []).length, 2);
    assert.equal(anyDetailsOpen(html), false);
  });

  it('are labelled "View score breakdown" and "How is this calculated?"', () => {
    assert.match(html, /<summary[^>]*>[\s\S]*?View score breakdown/);
    assert.match(html, /<summary[^>]*>[\s\S]*?How is this calculated\?/);
  });

  it('indicate open/closed without relying on colour: Show/Hide text and a chevron', () => {
    assert.match(html, /group-open:hidden">Show</);
    assert.match(html, /hidden group-open:inline">Hide</);
    assert.match(html, /group-open:rotate-180 motion-reduce:transition-none/);
  });

  it('the summary is a real <summary> (native keyboard + screen-reader behaviour) with a visible focus style and a ≥44px target', () => {
    assert.match(html, /<summary class="[^"]*focus-visible:outline[^"]*"/);
    assert.match(html, /<summary class="[^"]*min-h-\[44px\]/);
  });

  it('Disclosure on its own: collapsed, summary first, content after', () => {
    const d = render(<Disclosure title="Example"><p>Body text</p></Disclosure>);
    assert.match(d, /^<details class="group/);
    assert.equal(anyDetailsOpen(d), false);
    assert.ok(d.indexOf('Example') < d.indexOf('Body text'));
  });
});

describe('B. score breakdown — uses the values returned by the API', () => {
  it('shows each factor as points/max with its own progress bar and the existing explanation', () => {
    const html = ready(cc0001);
    assert.match(html, /29\.2\/50/);
    assert.match(html, /11\.7\/40/);
    assert.match(html, /2\.9\/10/);
    assert.match(html, /aria-label="Open issues score" aria-valuemin="0" aria-valuemax="50" aria-valuenow="29.2"/);
    assert.match(html, /aria-label="Citizen experience score" aria-valuemin="0" aria-valuemax="40" aria-valuenow="11.7"/);
    assert.match(html, /aria-label="Verified maintenance score" aria-valuemin="0" aria-valuemax="10" aria-valuenow="2.9"/);
    assert.match(html, /No open complaints\. Credit counted at 58% because citizen ratings are low\./);
    assert.match(html, /Average 1\.3★ from 3 reviews\./);
  });

  it('is NOT hardcoded: a different toilet shows different numbers and none of CC-PMC-0001\'s', () => {
    const html = ready(wellRated);
    assert.match(html, />87<span/);
    assert.match(html, /50\/50/);
    assert.match(html, /37\.4\/40/);
    assert.match(html, /0\/10/);
    assert.match(html, /Average 5\.0★ from 20 reviews\./);
    assert.doesNotMatch(html, /29\.2\/50|11\.7\/40|2\.9\/10|>44</);
    assert.match(html, /Based on 20 records · Sufficient evidence/);
  });

  it('API notes live inside the breakdown, after its summary', () => {
    const html = ready(cc0001);
    const note = 'reduced to 58%';
    assert.ok(html.indexOf(note) > html.indexOf('View score breakdown'));
    assert.match(html, />Notes</);
  });

  it('factor bars use text + numbers as well as colour: 58% is amber, 29% is red, and the fills are the high-contrast shades', () => {
    const html = ready(cc0001);
    const bars = [...html.matchAll(/<div role="progressbar" aria-label="([^"]+) score"[^>]*><div class="[^"]*\b(bg-(?:green-700|amber-700|red-600))\b/g)];
    const tone = Object.fromEntries(bars.map((m) => [m[1], m[2]]));
    assert.equal(tone['Open issues'], 'bg-amber-700'); //   29.2/50 = 58%
    assert.equal(tone['Citizen experience'], 'bg-red-600'); // 11.7/40 = 29%
    assert.equal(tone['Verified maintenance'], 'bg-red-600'); // 2.9/10 = 29%
    assert.match(html, /29\.2\/50/); // the number is always shown beside the bar
    assert.doesNotMatch(html, /bg-green-600|bg-amber-500/); // the low-contrast shades are gone
  });
});

describe('C. "How is this calculated?" — matches the implemented rules', () => {
  const html = ready(cc0001);
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  it('explains the three factors in plain language', () => {
    assert.match(text, /Open Issues \(up to 50 points\): reduced by unresolved complaints according to their severity and how far maintenance has progressed\./);
    assert.match(text, /Citizen Experience \(up to 40 points\): based on citizen ratings, and weighted toward neutral when there are only a few reviews\./);
    assert.match(text, /Verified Maintenance \(up to 10 points\): based on maintenance verified by an administrator, and reduced while problems remain open\./);
  });

  it('explains that poor ratings reduce the credit for no complaints and for verified maintenance', () => {
    assert.match(text, /Poor citizen ratings also reduce the credit given for having no open complaints and for verified maintenance/);
  });

  it('says why the score differs from the star rating — once', () => {
    assert.match(text, /This score is separate from the star rating/);
    assert.equal((text.match(/separate from the star rating/g) ?? []).length, 1);
  });

  it('lists the score categories', () => {
    assert.match(text, /Good \(75–100\), Fair \(50–74\), Needs Attention \(below 50\)/);
  });

  it('takes the point maxima from the API response (so it cannot drift from the numbers)', () => {
    const custom: ToiletHealth = {
      ...cc0001,
      factors: [
        { ...cc0001.factors[0], maxPoints: 60 },
        { ...cc0001.factors[1], maxPoints: 30 },
        { ...cc0001.factors[2], maxPoints: 10 },
      ],
    };
    const t = ready(custom).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.match(t, /Open Issues \(up to 60 points\)/);
    assert.match(t, /Citizen Experience \(up to 30 points\)/);
  });
});

// ── D. evidence & confidence ──────────────────────────────────────
describe('D. evidence and confidence', () => {
  it('limited evidence: flagged in the badge, the evidence line and with a non-colour cue', () => {
    const html = ready(limited);
    assert.match(html, /Good \(limited data\)/);
    assert.match(html, /Based on 1 record · Limited evidence/);
    assert.match(html, /border-dashed/);
    assert.match(html, /font-medium text-amber-800">Based on 1 record/);
  });

  it('uses the singular for exactly one record and never invents a confidence level', () => {
    assert.match(ready(limited), /Based on 1 record ·/);
    assert.doesNotMatch(ready(limited), /1 records/);
    assert.doesNotMatch(ready(cc0001), /Limited evidence/);
  });

  it('insufficient: keeps "Not enough data yet" — no number, no bar, no breakdown, no invented insight', () => {
    const html = ready(insufficient);
    assert.match(html, /Not enough data yet/);
    assert.match(html, /cannot be calculated/);
    assert.doesNotMatch(html, /progressbar/);
    assert.doesNotMatch(html, /\/100/);
    assert.doesNotMatch(html, /View score breakdown/);
    assert.doesNotMatch(html, /Based on \d+ record/);
    assert.doesNotMatch(html, /Estimated condition based on/);
    // the methodology is still available, collapsed, so people can see what will count
    assert.match(html, /How is this calculated\?/);
    assert.equal(anyDetailsOpen(html), false);
    assert.match(html, /Open Issues<\/strong> \(up to 50 points\)/); // fallback maxima when the API sent no factors
  });
});

describe('safety', () => {
  it('renders text safely: HTML in a detail string is escaped, not injected', () => {
    const evil: ToiletHealth = {
      ...cc0001,
      factors: [{ ...cc0001.factors[0], detail: '<img src=x onerror=alert(1)>' }, cc0001.factors[1], cc0001.factors[2]],
    };
    const html = ready(evil);
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;img src=x/);
  });
});

describe('ToiletHealthBadge (list rows) — unchanged', () => {
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
