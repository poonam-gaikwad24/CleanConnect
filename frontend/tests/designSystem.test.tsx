// Run (from frontend/):  npx tsx --test tests/designSystem.test.tsx
//
// Tests for the shared design-system pieces and the role-based navigation. Static rendering only
// (no browser): they check markup, accessibility wiring and the rules in utils/navLinks.ts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
// tsconfig.json only covers src/, so tsx compiles this file with the classic JSX transform.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import type { Role } from '../src/api/auth';
import { CategoryBadge, ComplaintStatusBadge, RequestStatusBadge, TaskStatusBadge } from '../src/components/StatusBadges';
import TaskProgress, { currentStepIndex } from '../src/components/TaskProgress';
import Alert from '../src/components/ui/Alert';
import Badge from '../src/components/ui/Badge';
import Card from '../src/components/ui/Card';
import Field from '../src/components/ui/Field';
import ListCard from '../src/components/ui/ListCard';
import PageContainer from '../src/components/ui/PageContainer';
import PageHeader from '../src/components/ui/PageHeader';
import Pagination from '../src/components/ui/Pagination';
import { EmptyState, LoadingState } from '../src/components/ui/States';
import { navItemsFor } from '../src/utils/navLinks';

const render = (el: React.ReactElement) => renderToStaticMarkup(<StaticRouter location="/">{el}</StaticRouter>);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// ── navigation ────────────────────────────────────────────────────
describe('role-based navigation links', () => {
  const labels = (r: Role | null) => navItemsFor(r).map((i) => i.label);

  it('signed-out visitors only see the public directory', () => {
    assert.deepEqual(labels(null), ['Toilets']);
  });

  it('citizens get the reporting and request links', () => {
    assert.deepEqual(labels('CITIZEN'), ['Toilets', 'Report an Issue', 'My Complaints', 'Request a Toilet', 'My Requests']);
  });

  it('staff get their task list — and none of the citizen-only links they used to be shown', () => {
    assert.deepEqual(labels('STAFF'), ['Toilets', 'My Tasks']);
  });

  it('admins get the management links — and none of the citizen-only links', () => {
    assert.deepEqual(labels('ADMIN'), ['Toilets', 'Complaints', 'Toilet Requests', 'Manage Toilets', 'Staff']);
  });

  // Parse the real route table, so this fails if a nav link ever points at a missing or forbidden route.
  const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/routes/AppRoutes.tsx'), 'utf8');
  const routes = [...source.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/>/g)].map((m) => ({
    path: m[1],
    role: m[2].match(/<ProtectedRoute\s+role="(\w+)"/)?.[1] as Role | undefined,
    protectedRoute: /<ProtectedRoute/.test(m[2]),
  }));
  const matches = (pattern: string, url: string) =>
    new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$').test(url);

  it('the route table was parsed (sanity)', () => {
    assert.ok(routes.length >= 15, `only ${routes.length} routes parsed`);
  });

  for (const role of [null, 'CITIZEN', 'STAFF', 'ADMIN'] as (Role | null)[]) {
    it(`every link shown to ${role ?? 'signed-out visitors'} leads to a route they may open`, () => {
      for (const item of navItemsFor(role)) {
        const route = routes.find((r) => matches(r.path, item.to));
        assert.ok(route, `${item.to} has no route`);
        if (route.role) assert.equal(route.role, role, `${item.to} requires ${route.role}`);
        if (route.protectedRoute) assert.notEqual(role, null, `${item.to} requires signing in`);
      }
    });
  }
});

// ── Field: label / hint / error wiring ────────────────────────────
describe('Field', () => {
  it('ties the label to the control and keeps an existing id', () => {
    const html = render(
      <Field label="Email">
        <input id="email" className="field" />
      </Field>
    );
    assert.match(html, /<label for="email" class="label">Email<\/label>/);
    assert.match(html, /<input id="email"/);
  });

  it('generates an id when the control has none, and links label and control', () => {
    const html = render(
      <Field label="Name">
        <input className="field" />
      </Field>
    );
    const id = html.match(/<label for="([^"]+)"/)![1];
    assert.match(html, new RegExp(`<input[^>]*id="${id.replace(/[:]/g, '\\:')}"`));
  });

  it('help text and error are announced: aria-describedby, aria-invalid, role=alert', () => {
    const html = render(
      <Field label="Photo" help="Up to 5MB" error="Wrong type">
        <input id="photo" className="field" />
      </Field>
    );
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /aria-describedby="photo-help photo-error"/);
    assert.match(html, /<p id="photo-help" class="help-text">Up to 5MB<\/p>/);
    assert.match(html, /<p id="photo-error" role="alert" class="error-text">Wrong type<\/p>/);
  });

  it('without an error there is no alert and no aria-invalid', () => {
    const html = render(
      <Field label="Photo" help="Up to 5MB">
        <input id="photo" className="field" />
      </Field>
    );
    assert.doesNotMatch(html, /role="alert"|aria-invalid/);
    assert.match(html, /aria-describedby="photo-help"/);
  });
});

// ── Alert / states / badges ───────────────────────────────────────
describe('Alert', () => {
  it('errors are announced immediately; other tones politely; icons are decorative', () => {
    assert.match(render(<Alert tone="error">Oops</Alert>), /role="alert"/);
    for (const tone of ['warning', 'success', 'info'] as const) {
      assert.match(render(<Alert tone={tone}>Hi</Alert>), /role="status"/);
    }
    assert.match(render(<Alert tone="error">Oops</Alert>), /<svg aria-hidden="true"/);
    assert.match(text(render(<Alert tone="error">Oops</Alert>)), /Oops/);
  });
});

describe('LoadingState / EmptyState', () => {
  it('loading: polite status, spinner hidden from screen readers and stopped for reduced motion', () => {
    const html = render(<LoadingState label="Loading things…" />);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /Loading things…/);
    assert.match(html, /motion-reduce:animate-none/);
    assert.match(html, /<svg aria-hidden="true"/);
  });

  it('empty: title, description and action are all shown', () => {
    const html = render(<EmptyState title="Nothing here" description="Come back later" action={<button>Do it</button>} />);
    assert.match(text(html), /Nothing here Come back later Do it/);
  });
});

describe('Badge and status badges', () => {
  it('Badge shows its text', () => {
    assert.match(render(<Badge tone="success">OK</Badge>), />OK</);
  });

  it('every complaint, task and request status renders text + a decorative icon', () => {
    for (const s of ['PENDING', 'IN_PROGRESS', 'RESOLVED'] as const) {
      const html = render(<ComplaintStatusBadge status={s} />);
      assert.ok(text(html).length > 2, s);
      assert.match(html, /<svg aria-hidden="true"/);
    }
    for (const s of ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUIRED', 'VERIFIED'] as const) {
      const html = render(<TaskStatusBadge status={s} />);
      assert.ok(text(html).length > 2, s);
      assert.match(html, /<svg aria-hidden="true"/);
    }
    for (const s of ['PENDING', 'APPROVED', 'REJECTED'] as const) {
      const html = render(<RequestStatusBadge status={s} />);
      assert.ok(text(html).length > 2, s);
      assert.match(html, /<svg aria-hidden="true"/);
    }
    assert.ok(text(render(<CategoryBadge category="WATER_SHORTAGE" />)).length > 2);
  });

  it('status tones follow meaning: resolved/verified/approved green, rejected/revision red, pending amber', () => {
    assert.match(render(<ComplaintStatusBadge status="RESOLVED" />), /bg-green-100/);
    assert.match(render(<TaskStatusBadge status="VERIFIED" />), /bg-green-100/);
    assert.match(render(<RequestStatusBadge status="APPROVED" />), /bg-green-100/);
    assert.match(render(<RequestStatusBadge status="REJECTED" />), /bg-red-100/);
    assert.match(render(<TaskStatusBadge status="REVISION_REQUIRED" />), /bg-red-100/);
    assert.match(render(<ComplaintStatusBadge status="PENDING" />), /bg-amber-100/);
  });

  it('different statuses are distinguishable by text, not only colour', () => {
    const labels = new Set(['PENDING', 'IN_PROGRESS', 'RESOLVED'].map((s) => text(render(<ComplaintStatusBadge status={s as never} />))));
    assert.equal(labels.size, 3);
    const taskLabels = new Set(['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUIRED', 'VERIFIED'].map((s) => text(render(<TaskStatusBadge status={s as never} />))));
    assert.equal(taskLabels.size, 5);
  });
});

// ── layout primitives ─────────────────────────────────────────────
describe('PageHeader / PageContainer / Card / ListCard / Pagination', () => {
  it('PageHeader renders exactly one h1, optional eyebrow, subtitle, actions and back link', () => {
    const html = render(
      <PageHeader title="My Page" subtitle="About it" eyebrow="CODE-1" actions={<button>Go</button>} back={{ to: '/x', label: 'Back' }} />
    );
    assert.equal((html.match(/<h1/g) ?? []).length, 1);
    assert.match(html, /<h1[^>]*>My Page<\/h1>/);
    assert.match(html, /CODE-1/);
    assert.match(html, /About it/);
    assert.match(html, /href="\/x"/);
    assert.match(html, />Go</);
  });

  it('PageContainer applies one of four standard widths', () => {
    assert.match(render(<PageContainer size="auth">x</PageContainer>), /max-w-md/);
    assert.match(render(<PageContainer size="narrow">x</PageContainer>), /max-w-2xl/);
    assert.match(render(<PageContainer>x</PageContainer>), /max-w-5xl/);
    assert.match(render(<PageContainer size="wide">x</PageContainer>), /max-w-6xl/);
  });

  it('Card uses the shared surface class', () => {
    assert.match(render(<Card>x</Card>), /class="card p-5 "/);
  });

  it('ListCard is one link with title, eyebrow, meta and badges; chevron is decorative', () => {
    const html = render(<ListCard to="/things/1" eyebrow="T-1" title="Thing" meta={<p>Meta</p>} badges={<span>Badge</span>} />);
    assert.equal((html.match(/<a /g) ?? []).length, 1);
    assert.match(html, /href="\/things\/1"/);
    assert.match(text(html), /T-1 Thing Meta Badge/);
    assert.match(html, /<svg aria-hidden="true"/);
  });

  it('Pagination: Previous disabled on page 1, Next disabled on the last page, summary shown', () => {
    const first = render(<Pagination page={1} totalPages={3} total={25} onPrevious={() => undefined} onNext={() => undefined} />);
    assert.match(first, /<nav aria-label="Pagination"/);
    assert.match(first, /<button type="button" disabled="" class="btn btn-secondary btn-sm">Previous/);
    assert.doesNotMatch(first, /disabled="" class="btn btn-secondary btn-sm">Next/);
    assert.match(first, /Page 1 of 3 \(25 total\)/);
    const last = render(<Pagination page={3} totalPages={3} onPrevious={() => undefined} onNext={() => undefined} />);
    assert.match(last, /disabled="" class="btn btn-secondary btn-sm">Next/);
    assert.doesNotMatch(last, /\(\d+ total\)/);
  });
});

// ── workflow progress ─────────────────────────────────────────────
describe('TaskProgress', () => {
  const stepsOf = (status: Parameters<typeof TaskProgress>[0]['status']) =>
    [...render(<TaskProgress status={status} />).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]));

  it('is a labelled ordered list of four steps', () => {
    const html = render(<TaskProgress status="ASSIGNED" />);
    assert.match(html, /<ol aria-label="Task progress"/);
    assert.equal(stepsOf('ASSIGNED').length, 4);
  });

  it('each state says Done / Current / Next in words', () => {
    assert.deepEqual(stepsOf('ASSIGNED').map((s) => s.split(' ').slice(-1)[0]), ['Current', 'Next', 'Next', 'Next']);
    assert.match(stepsOf('IN_PROGRESS')[0], /Done/);
    assert.match(stepsOf('IN_PROGRESS')[1], /Current/);
    assert.match(stepsOf('SUBMITTED')[2], /Current/);
    for (const s of stepsOf('VERIFIED')) assert.match(s, /Done/);
  });

  it('revision required shows "needs rework" on the in-progress step, never as a fifth step', () => {
    assert.equal(stepsOf('REVISION_REQUIRED').length, 4);
    assert.match(stepsOf('REVISION_REQUIRED')[1], /Current — needs rework/);
    assert.equal(currentStepIndex('REVISION_REQUIRED'), 1);
  });

  it('exactly one step is marked aria-current (none once verified)', () => {
    for (const s of ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUIRED'] as const) {
      assert.equal((render(<TaskProgress status={s} />).match(/aria-current="step"/g) ?? []).length, 1, s);
    }
    assert.equal((render(<TaskProgress status="VERIFIED" />).match(/aria-current/g) ?? []).length, 0);
  });
});
