// Run (from frontend/):  npx tsx --test tests/toiletDetailsLayout.test.tsx
//
// Renders the real ToiletDetailsLayout (inside a static router, so <Link> works) and
// checks structure, ordering, role-based behaviour and the responsive class contract.
// It cannot measure pixels: whether the columns actually look right at a given width
// must be checked in a browser (see the handover checklist).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
// tsconfig.json only covers src/, so tsx compiles this file with the classic JSX transform.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import type { Role } from '../src/api/auth';
import type { Toilet } from '../src/api/toilets';
import SectionCard from '../src/components/SectionCard';
import ToiletDetailsLayout from '../src/components/ToiletDetailsLayout';

const toilet: Toilet = {
  id: 'b99956c3-f091-40b6-980e-2e82edeb9b4d',
  cleanConnectId: 'CC-PMC-0001',
  externalId: 'PMC-123',
  location: 'Near Shaniwar Wada, Kasba Peth',
  type: 'Community toilet',
  ward: 12,
  landmark: 'Shaniwar Wada',
  status: 'Working',
} as unknown as Toilet;

const render = (opts: { role: Role | null; toilet?: Partial<Toilet> }) =>
  renderToStaticMarkup(
    <StaticRouter location="/toilets/CC-PMC-0001">
      <ToiletDetailsLayout
        toilet={{ ...toilet, ...opts.toilet } as Toilet}
        role={opts.role}
        healthCard={<div data-slot="health">HEALTH-SLOT</div>}
        reviews={<div data-slot="reviews">REVIEWS-SLOT</div>}
      />
    </StaticRouter>
  );

// Visible text, the way a browser would show it: tags removed, HTML entities decoded.
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

describe('structure', () => {
  const html = render({ role: 'CITIZEN' });

  it('header card: CleanConnect ID and the toilet name as the single h1', () => {
    assert.match(html, /<h1[^>]*>Near Shaniwar Wada, Kasba Peth<\/h1>/);
    assert.match(html, /CleanConnect ID: CC-PMC-0001/);
    assert.equal((html.match(/<h1/g) ?? []).length, 1);
  });

  it('has Toilet Details and Report an Issue cards, and slots for the health card and reviews — each exactly once', () => {
    assert.equal((html.match(/>Toilet Details<\/h2>/g) ?? []).length, 1);
    assert.equal((html.match(/>Report an Issue<\/h2>/g) ?? []).length, 1);
    assert.equal((html.match(/HEALTH-SLOT/g) ?? []).length, 1);
    assert.equal((html.match(/REVIEWS-SLOT/g) ?? []).length, 1);
  });

  it('every section is labelled by its own heading, and no id is duplicated', () => {
    for (const m of html.matchAll(/<section aria-labelledby="([^"]+)"/g)) {
      assert.match(html, new RegExp(`<h2 id="${m[1]}"`));
    }
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, ids.join(','));
  });

  it('SectionCard gives the other cards the same shell (Ratings & Reviews title renders correctly)', () => {
    const card = renderToStaticMarkup(
      <SectionCard title="Ratings & Reviews" headingId="toilet-reviews-heading">
        body
      </SectionCard>
    );
    assert.match(card, /<h2 id="toilet-reviews-heading"[^>]*>Ratings &amp; Reviews<\/h2>/);
    assert.doesNotMatch(card, /&amp;amp;/);
    assert.match(card, /class="rounded-lg border border-slate-200 bg-white shadow-sm"/);
  });
});

describe('toilet details content (existing fields and fallbacks preserved)', () => {
  it('shows every detail field', () => {
    const t = text(render({ role: 'CITIZEN' }));
    assert.match(t, /Source \(PMC\) ID PMC-123/);
    assert.match(t, /Type Community toilet/);
    assert.match(t, /Ward 12/);
    assert.match(t, /Landmark Shaniwar Wada/);
    assert.match(t, /Status Working/);
  });

  it('keeps the original fallback wording when data is missing', () => {
    const t = text(
      render({ role: 'CITIZEN', toilet: { cleanConnectId: null, externalId: null, type: null, ward: null, landmark: null, status: null } as never })
    );
    assert.match(t, /CleanConnect ID: Not yet assigned/);
    assert.match(t, /None — registered directly via CleanConnect/);
    assert.equal((t.match(/Not recorded/g) ?? []).length, 4);
  });

  it('keeps the Google Maps link safe, and the honesty disclaimer next to it', () => {
    const html = render({ role: null });
    assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=/);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    assert.match(html, /\(opens in a new tab\)/);
    assert.match(text(html), /not a confirmed exact match to CleanConnect's record/);
  });
});

describe('Report an Issue card — by role (access itself is still enforced by the route)', () => {
  it('CITIZEN: a button linking to the existing complaint form for this toilet', () => {
    const html = render({ role: 'CITIZEN' });
    assert.match(html, /href="\/complaints\/create\?toilet=CC-PMC-0001"/);
    assert.doesNotMatch(html, /Log in/);
  });

  it('falls back to the toilet id when there is no CleanConnect ID', () => {
    const html = render({ role: 'CITIZEN', toilet: { cleanConnectId: null } as never });
    assert.match(html, new RegExp(`href="/complaints/create\\?toilet=${toilet.id}"`));
  });

  it('signed out: a log-in prompt, and no link to the complaint form', () => {
    const html = render({ role: null });
    assert.match(html, /href="\/login"/);
    assert.match(text(html), /to report an issue\./);
    assert.doesNotMatch(html, /complaints\/create/);
  });

  for (const role of ['STAFF', 'ADMIN'] as Role[]) {
    it(`${role}: explains that citizens report issues, instead of linking to a page that would refuse them`, () => {
      const html = render({ role });
      assert.match(text(html), /Issue reports are submitted by citizens\./);
      assert.doesNotMatch(html, /complaints\/create/);
      assert.doesNotMatch(html, /href="\/login"/);
    });
  }
});

describe('responsive layout contract', () => {
  const html = render({ role: 'CITIZEN' });

  it('below lg it is ONE column (flex-col); from lg it becomes a 12-column grid', () => {
    assert.match(html, /class="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8"/);
  });

  it('desktop columns: left 5/12 (sticky), right 7/12', () => {
    assert.match(html, /class="contents lg:sticky lg:top-6 lg:col-span-5 lg:flex lg:flex-col lg:gap-6"/);
    assert.match(html, /class="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6"/);
  });

  it('on small screens the column wrappers dissolve (display: contents)', () => {
    assert.equal((html.match(/class="contents /g) ?? []).length, 2);
  });

  it('small-screen order is Details → Health → Report → Reviews', () => {
    const at = (re: RegExp) => html.search(re);
    const order = (n: number) => at(new RegExp(`class="order-${n}"`));
    assert.ok(order(1) > -1 && order(2) > -1 && order(3) > -1 && order(4) > -1);
    // which card sits in which order slot
    assert.match(html, /class="order-1"><section[^>]*aria-labelledby="toilet-details-heading"/);
    assert.match(html, /class="order-2"><div data-slot="health"/);
    assert.match(html, /class="order-3"><section[^>]*aria-labelledby="toilet-report-heading"/);
    assert.match(html, /class="order-4"><div data-slot="reviews"/);
  });

  it('the details list is 1 column on phones, 2 on tablets, and back to 1 inside the narrow desktop column', () => {
    assert.match(html, /<dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-1"/);
  });

  it('interactive controls use the shared design-system classes (.btn / .link), which carry the tap-target size and focus style', () => {
    const controls = [...html.matchAll(/<(a|button)\b[^>]*class="([^"]*)"/g)].map((m) => m[2]);
    assert.equal(controls.length, 2); // Google Maps link + Report button
    for (const cls of controls) {
      if (/^inline-flex items-center gap-1\.5 text-sm font-medium/.test(cls)) continue; // the plain "back" text link
      assert.match(cls, /\b(btn|link)\b/, cls);
    }
  });
});
