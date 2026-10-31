import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from '../src/App';
import { AUTH_TOKEN_KEY } from '../src/api/client';
import { byText, click, errors, label, mount, makeServer, q, qa, results, scenario, setFile, settle, textOf, tick, type, until, Role } from './helpers';

const PERM = "You don't have permission to view this page.";
const LOC1 = 'CC-PMC-0001 — Test Road 1, Kasba Peth';
type Access = 'public' | 'any' | 'CITIZEN' | 'ADMIN' | 'STAFF';
const ROUTES: { path: string; h1: string | RegExp; access: Access }[] = [
  { path: '/', h1: 'Cleaner public toilets, maintained together.', access: 'public' },
  { path: '/toilets', h1: 'Public Toilets', access: 'public' },
  { path: '/toilets/t-1', h1: 'Test Road 1, Kasba Peth', access: 'public' },
  { path: '/login', h1: 'Log in', access: 'public' },
  { path: '/register', h1: 'Create an account', access: 'public' },
  { path: '/complaints/create', h1: 'Report an Issue', access: 'CITIZEN' },
  { path: '/my-complaints', h1: 'My Complaints', access: 'any' },
  { path: '/complaints/c-1', h1: LOC1, access: 'any' },
  { path: '/admin/complaints', h1: 'Complaints (Admin)', access: 'ADMIN' },
  { path: '/toilet-requests/create', h1: 'Request Toilet Registration', access: 'CITIZEN' },
  { path: '/my-toilet-requests', h1: 'My Toilet Requests', access: 'any' },
  { path: '/toilet-requests/r-1', h1: 'Kharadi bus stop', access: 'any' },
  { path: '/admin/toilet-requests', h1: 'Toilet Registration Requests', access: 'ADMIN' },
  { path: '/admin/toilets', h1: 'Manage Toilets', access: 'ADMIN' },
  { path: '/admin/toilets/new', h1: 'Add New Toilet', access: 'ADMIN' },
  { path: '/staff/tasks', h1: 'My Tasks', access: 'STAFF' },
  { path: '/staff/tasks/t-assigned', h1: LOC1, access: 'STAFF' },
  { path: '/admin/tasks/t-submitted', h1: LOC1, access: 'ADMIN' },
  { path: '/admin/staff', h1: 'Staff Management', access: 'ADMIN' },
];
const NAV: Record<Role, string[]> = {
  guest: ['Toilets'],
  citizen: ['Toilets', 'Report an Issue', 'My Complaints', 'Request a Toilet', 'My Requests'],
  staff: ['Toilets', 'My Tasks'],
  admin: ['Toilets', 'Complaints', 'Toilet Requests', 'Manage Toilets', 'Staff'],
};

// generic accessibility audit run on every rendered page
function a11yProblems(): string[] {
  const out: string[] = [];
  const forIds = new Set(qa('label[for]').map((l) => l.getAttribute('for')));
  for (const el of qa('input,select,textarea')) {
    const t = (el as HTMLInputElement).type;
    if (['hidden', 'submit', 'button'].includes(t)) continue;
    if (!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && forIds.has(el.id)) || el.closest('label')))
      out.push(`unlabelled <${el.tagName.toLowerCase()} type=${t}> ${el.outerHTML.slice(0, 70)}`);
  }
  for (const b of qa('button,a[href]')) if (!((b.textContent ?? '').trim() || b.getAttribute('aria-label'))) out.push('no accessible name: ' + b.outerHTML.slice(0, 90));
  for (const img of qa('img')) if (!img.hasAttribute('alt')) out.push('img without alt');
  const ids = qa('[id]').map((e) => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i); if (dup.length) out.push('duplicate ids: ' + dup.join(','));
  for (const s of qa('section[aria-labelledby]')) if (!document.getElementById(s.getAttribute('aria-labelledby')!)) out.push('section labelled by missing heading');
  for (const bar of qa('[role=progressbar]')) if (!bar.getAttribute('aria-label') || bar.getAttribute('aria-valuenow') === null) out.push('progressbar without name/value');
  for (const svg of qa('svg')) if (svg.getAttribute('aria-hidden') !== 'true') out.push('svg not aria-hidden');
  if (!q('main#main-content')) out.push('no main landmark');
  return out;
}
const navLabels = () => qa('nav[aria-label="Main"] ul li a').map((a) => a.textContent!.trim());
const file = (name = 'p.png', type = 'image/png') => new File([new Uint8Array([1, 2, 3])], name, { type });

async function run() {
  // ─────────────── route × role matrix ───────────────
  await scenario(`ROUTE MATRIX: ${ROUTES.length} routes × 4 roles — right page or right refusal; accessibility audit on each`, async () => {
    let checked = 0;
    for (const role of ['guest', 'citizen', 'staff', 'admin'] as Role[]) {
      for (const r of ROUTES) {
        const { unmount } = await mount(role, r.path);
        const signedIn = role !== 'guest';
        const allowed = r.access === 'public' || (r.access === 'any' && signedIn) || (signedIn && r.access.toLowerCase() === role);
        const h1s = qa('h1').map((h) => h.textContent!.trim());
        const where = `${role} ${r.path}`;
        if (allowed) {
          assert.equal(h1s.length, 1, `${where}: expected exactly one h1, got ${JSON.stringify(h1s)}`);
          assert.ok(typeof r.h1 === 'string' ? h1s[0] === r.h1 : r.h1.test(h1s[0]), `${where}: h1 was "${h1s[0]}"`);
        } else if (!signedIn) {
          assert.deepEqual(h1s, ['Log in'], `${where}: guests must be sent to the login page, got ${JSON.stringify(h1s)}`);
        } else {
          assert.ok(textOf().includes(PERM), `${where}: expected the permission message`);
          assert.equal(h1s.length, 0, `${where}: the refusal page must not render the page's content`);
        }
        const probs = a11yProblems(); assert.deepEqual(probs, [], `${where}: ${probs.join(' | ')}`);
        assert.deepEqual(navLabels(), NAV[role], `${where}: nav links`);
        assert.deepEqual(errors, [], `${where}: console errors ${errors[0]}`);
        await unmount(); checked++;
      }
    }
    assert.equal(checked, ROUTES.length * 4);
  });

  // ─────────────── shell, navigation, auth ───────────────
  await scenario('APP SHELL: skip link, one main landmark, header nav, footer (real App component)', async () => {
    document.body.innerHTML = '<div id="root"></div>'; localStorage.clear();
    makeServer('guest');
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<App />); }); await settle();
    const skip = q('a[href="#main-content"]');
    assert.ok(skip && /Skip to main content/.test(skip.textContent!)); assert.ok(skip!.className.includes('sr-only'));
    assert.equal(qa('main').length, 1); assert.equal(q('main')!.id, 'main-content');
    assert.ok(q('header nav[aria-label="Main"]')); assert.ok(q('footer'));
    assert.deepEqual(['Log in', 'Register'].map((t) => !!byText('header a', t)), [true, true]);
    await act(async () => root.unmount());
  });

  await scenario('NAV: active page is marked (aria-current + underline), and only that one', async () => {
    const { unmount } = await mount('citizen', '/my-complaints');
    const cur = qa('nav[aria-label="Main"] a[aria-current="page"]');
    assert.equal(cur.length, 1); assert.equal(cur[0].textContent, 'My Complaints');
    assert.match(cur[0].className, /underline/); assert.match(cur[0].className, /font-semibold/);
    await unmount();
  });

  await scenario('NAV: account area per role (name + role badge + Log out; guests get Log in / Register)', async () => {
    let m = await mount('admin', '/'); assert.match(q('header')!.textContent!, /Ada Admin\s*Admin/); assert.ok(byText('header button', 'Log out')); await m.unmount();
    m = await mount('staff', '/'); assert.match(q('header')!.textContent!, /Sam Staff\s*Staff/); await m.unmount();
    m = await mount('citizen', '/'); assert.match(q('header')!.textContent!, /Asha Citizen\s*Citizen/); await m.unmount();
  });

  await scenario('NAV (mobile): menu button toggles aria-expanded; Escape closes; choosing a link navigates and closes', async () => {
    const { unmount } = await mount('citizen', '/');
    const btn = q('button[aria-controls="mobile-nav"]')!;
    assert.equal(btn.getAttribute('aria-expanded'), 'false'); assert.equal(q('#mobile-nav'), null);
    await click(btn); assert.equal(btn.getAttribute('aria-expanded'), 'true');
    assert.deepEqual(qa('#mobile-nav ul li a').map((a) => a.textContent!.trim()), NAV.citizen);
    assert.match(q('#mobile-nav')!.textContent!, /Signed in as Asha Citizen \(Citizen\)/);
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    assert.equal(btn.getAttribute('aria-expanded'), 'false'); assert.equal(q('#mobile-nav'), null);
    await click(btn); await click(byText('#mobile-nav a', 'My Complaints')!); await settle();
    assert.equal(q('#mobile-nav'), null, 'menu closes after navigating'); assert.equal(q('h1')!.textContent, 'My Complaints');
    await unmount();
  });

  await scenario('AUTH: log out clears the session and the nav falls back to guest links', async () => {
    const { unmount } = await mount('citizen', '/my-complaints');
    await click(byText('header button', 'Log out')!); await settle();
    assert.equal(localStorage.getItem(AUTH_TOKEN_KEY), null);
    assert.ok(byText('header a', 'Log in')); assert.deepEqual(navLabels(), ['Toilets']);
    await unmount();
  });

  await scenario('AUTH: login form has real labels and signs the user in', async () => {
    const { server, unmount } = await mount('guest', '/login');
    assert.equal((label('Email') as HTMLInputElement).autocomplete, 'email');
    assert.equal((label('Password') as HTMLInputElement).autocomplete, 'current-password');
    await type(label('Email')!, 'asha@x.com'); await type(label('Password')!, 'password123');
    await click(q('button[type=submit]')!); await settle(server);
    assert.equal(server.count(/POST \/auth\/login/), 1); assert.equal(localStorage.getItem(AUTH_TOKEN_KEY), 'tok');
    assert.ok(byText('header button', 'Log out'), 'nav shows Log out after signing in');
    await unmount();
  });

  // ─────────────── citizen workflows ───────────────
  await scenario('COMPLAINT: search a toilet, pick it, bad file is rejected accessibly, good file accepted, submit', async () => {
    const { server, unmount } = await mount('citizen', '/complaints/create');
    assert.ok(byText('button[type=submit]', 'Submit complaint')!.hasAttribute('disabled'), 'submit disabled until toilet and category chosen');
    await type(q('#toilet-search')!, 'Test Road 2'); await until(() => server.count(/GET \/toilets/) >= 1 && !!byText('li button', /Test Road 2/), 'search results');
    await click(byText('li button', /Test Road 2/)!);
    assert.match(textOf(), /CC-PMC-0002/); assert.ok(byText('button', 'Change'));
    await type(label(/2\. Select issue category/)!, 'WATER_SHORTAGE');
    await type(label(/3\. Describe the problem/)!, 'No water since the morning, please fix.');
    const photo = label(/4\. Photo evidence/)!;
    await setFile(photo, file('doc.pdf', 'application/pdf'));
    const err = q(`#${photo.id}-error`)!; assert.ok(err && err.getAttribute('role') === 'alert' && err.textContent!.length > 5, 'error shown');
    assert.equal(photo.getAttribute('aria-invalid'), 'true'); assert.match(photo.getAttribute('aria-describedby')!, new RegExp(`${photo.id}-error`));
    await setFile(photo, file('ok.png'));
    assert.equal(q(`#${photo.id}-error`), null, 'error clears with a valid file'); assert.notEqual(photo.getAttribute('aria-invalid'), 'true');
    await click(byText('button[type=submit]', 'Submit complaint')!); await settle(server);
    assert.equal(server.count(/POST \/complaints/), 1);
    assert.match(textOf(), /Complaint submitted successfully/); assert.match(textOf(), /CMP-0004/);
    await click(byText('button', 'View my complaints')!); await settle(server);
    assert.equal(q('h1')!.textContent, 'My Complaints');
    await unmount();
  });

  await scenario('MY COMPLAINTS: cards show code, toilet, status badge (text + icon) and category', async () => {
    const { unmount } = await mount('citizen', '/my-complaints');
    const cards = qa('main ul > li a');
    assert.equal(cards.length, 3);
    assert.match(cards[0].textContent!, /Complaint #CMP-0001/); assert.match(cards[0].textContent!, /Test Road 1/);
    assert.ok(cards[0].querySelector('svg[aria-hidden="true"]'), 'badge icon present');
    assert.deepEqual(new Set(cards.map((c) => c.querySelector('span.rounded-full')!.textContent!.trim())).size >= 2, true, 'statuses are distinguishable as text');
    await click(cards[0]); await settle(); assert.match(q('h1')!.textContent!, /CC-PMC-0001/);
    await unmount();
  });

  await scenario('TOILET REQUEST (citizen): submit, then the success state', async () => {
    const { server, unmount } = await mount('citizen', '/toilet-requests/create');
    assert.ok(byText('button[type=submit]', 'Submit Request')!.hasAttribute('disabled'));
    await type(label('Location / Area *')!, 'Wakad flyover'); await click(byText('button[type=submit]', 'Submit Request')!); await settle(server);
    assert.equal(server.count(/POST \/toilet-requests/), 1); assert.match(textOf(), /Request submitted successfully/); assert.match(textOf(), /REQ-0003/);
    await unmount();
  });

  await scenario('TOILETS LIST: search, empty state, role-specific actions, pagination, health badges', async () => {
    let m = await mount('citizen', '/toilets');
    assert.equal(qa('ul.grid > li').length, 3); assert.match(textOf(), /Health 44\/100/);
    assert.ok(byText('a', 'Request registration')); assert.equal(qa('a').filter((a) => a.textContent === 'Report an issue').length, 3);
    assert.equal(qa('a').filter((a) => /View on Google Maps/.test(a.textContent ?? '')).length, 3);
    await type(q('#toilet-search')!, 'zzz'); await until(() => /No toilets found/.test(textOf()), 'empty state');
    assert.equal(q('nav[aria-label="Pagination"]'), null, 'no pagination when empty');
    await m.unmount();
    m = await mount('staff', '/toilets');
    assert.equal(byText('a', 'Request registration'), undefined); assert.equal(qa('a').filter((a) => a.textContent === 'Report an issue').length, 0);
    const pager = q('nav[aria-label="Pagination"]')!; assert.match(pager.textContent!, /Page 1 of 1 \(3 total\)/);
    assert.ok(qa('nav[aria-label="Pagination"] button').every((b) => b.hasAttribute('disabled')));
    await m.unmount();
  });

  await scenario('REVIEWS (restyled): citizen rates then deletes own review; admin moderation; staff sees no controls', async () => {
    let m = await mount('citizen', '/toilets/t-1');
    assert.ok(byText('button', 'Delete Review')); assert.equal(byText('button', /Delete review \(admin\)/), undefined);
    (window as any).confirm = () => true; await click(byText('button', 'Delete Review')!); await settle(m.server);
    assert.equal(m.server.count(/DELETE \/reviews\/rev-2/), 1); assert.ok(byText('button', 'Rate this toilet'));
    await click(byText('button', 'Rate this toilet')!); await click(q('[aria-label="4 stars"]')!);
    await type(label('Write a review (optional)')!, 'Better than before'); await click(byText('button', 'Submit Review')!); await settle(m.server);
    assert.equal(m.server.count(/POST \/reviews\/toilet/), 1); assert.match(textOf(), /Your Review/);
    assert.equal(m.server.count(/GET \/toilets\/t-1\/health/), 3, 'health: initial + after delete + after new review');
    await m.unmount();
    m = await mount('admin', '/toilets/t-1'); assert.equal(qa('button').filter((b) => /Delete review \(admin\)/.test(b.textContent ?? '')).length, 1);
    await m.unmount();
    m = await mount('staff', '/toilets/t-1'); assert.equal(byText('button', /Delete|Rate/), undefined); assert.match(textOf(), /Issue reports are submitted by citizens\./);
    await m.unmount();
  });

  await scenario('HEALTH CARD (restyled page): numeric score, collapsed sections that open/close, insufficient state', async () => {
    let m = await mount('guest', '/toilets/t-1');
    assert.match(textOf(), /44\/100/); assert.match(textOf(), /Citizen ratings are low, although no complaints are currently open\./);
    const [a, b] = qa('details'); assert.equal(qa('details').length, 2); assert.equal((a as HTMLDetailsElement).open, false);
    await click(a.querySelector('summary')!); assert.equal((a as HTMLDetailsElement).open, true); assert.match(a.textContent!, /29\.2\/50/);
    await click(a.querySelector('summary')!); assert.equal((a as HTMLDetailsElement).open, false);
    await click(b.querySelector('summary')!); assert.match(b.textContent!, /Good \(75–100\), Fair \(50–74\), Needs Attention \(below 50\)/);
    assert.match(textOf(), /Log in\s*to report an issue/);
    await m.unmount();
    m = await mount('guest', '/toilets/t-1', { health: { score: null, label: null, confidence: 'INSUFFICIENT', evidenceCount: 0, factors: [], notes: ['No reviews or complaints have been recorded for this toilet yet, so a health score cannot be calculated.'] } });
    assert.match(textOf(), /Not enough data yet/); assert.doesNotMatch(textOf(), /\/100/); assert.equal(qa('details').length, 1);
    await m.unmount();
  });

  // ─────────────── admin & staff workflows ───────────────
  await scenario('ADMIN assigns a task from the complaint page (form → API → task summary)', async () => {
    const { server, unmount } = await mount('admin', '/complaints/c-1');
    assert.ok(byText('button[type=submit]', 'Assign Task')!.hasAttribute('disabled'));
    await type(label('Staff member')!, 'u-staff'); await type(label('Task instruction')!, 'Repair the tap and test the pressure.');
    await click(byText('button[type=submit]', 'Assign Task')!); await settle(server);
    assert.equal(server.count(/POST \/maintenance-tasks/), 1);
    await until(() => /View task details/.test(textOf()), 'task summary'); assert.match(textOf(), /Assigned to Sam Staff/);
    await unmount();
  });

  await scenario('ADMIN complaints list: filters call the API with the chosen params; empty state', async () => {
    const { server, unmount } = await mount('admin', '/admin/complaints');
    assert.equal(qa('ul.grid > li').length, 3);
    await type(label('Status')!, 'PENDING'); await settle(server);
    assert.ok(server.calls.some((c) => /GET \/complaints .*"status":"PENDING"/.test(c))); assert.equal(qa('ul.grid > li').length, 1);
    await type(label('Category')!, 'CLEANLINESS'); await settle(server);
    assert.match(textOf(), /No complaints match these filters\./);
    assert.deepEqual(qa('select').map((s) => document.querySelector(`label[for="${s.id}"]`)!.textContent), ['Status', 'Category']);
    await unmount();
  });

  await scenario('STAFF workflow: progress → Start → submit proof → waiting for review', async () => {
    const { server, unmount } = await mount('staff', '/staff/tasks/t-assigned');
    const steps = () => qa('ol[aria-label="Task progress"] li').map((l) => l.textContent!.replace(/\s+/g, ' ').trim());
    assert.match(steps()[0], /Assigned.*Current/); assert.match(steps()[1], /In progress.*Next/);
    await click(byText('button', 'Start Task')!); await settle(server);
    assert.equal(server.count(/PATCH \/maintenance-tasks\/t-assigned\/start/), 1);
    await until(() => /Submit Work/.test(textOf()), 'submit form'); assert.match(steps()[0], /Done/); assert.match(steps()[1], /Current/);
    assert.ok(byText('button[type=submit]', 'Submit Work')!.hasAttribute('disabled'), 'cannot submit without a photo');
    const proof = label(/Proof-of-work photo/)!; await setFile(proof, file('bad.gif', 'image/gif'));
    assert.ok(q(`#${proof.id}-error`), 'wrong type rejected'); await setFile(proof, file('proof.png'));
    await type(label('Comment (optional)')!, 'Replaced the valve.');
    await act(async () => { q('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); await settle(server);
    assert.equal(server.count(/PATCH \/maintenance-tasks\/t-assigned\/submit/), 1);
    await until(() => /waiting for admin review/.test(textOf()), 'submitted'); assert.match(steps()[2], /Current/);
    await unmount();
  });

  await scenario('STAFF sees a rework request clearly (warning, "needs rework", admin feedback, Start again)', async () => {
    const { unmount } = await mount('staff', '/staff/tasks/t-revision');
    assert.match(textOf(), /An admin asked for further action/); assert.match(textOf(), /Photo unclear\./);
    assert.match(qa('ol[aria-label="Task progress"] li')[1].textContent!, /Current — needs rework/); assert.ok(byText('button', 'Start Task'));
    await unmount();
  });

  await scenario('ADMIN verifies submitted work: confirm step, API call, status becomes Verified', async () => {
    const { server, unmount } = await mount('admin', '/admin/tasks/t-submitted');
    assert.match(qa('ol[aria-label="Task progress"] li')[2].textContent!, /Current/);
    assert.equal(qa('img').length, 1, 'staff proof photo shown'); assert.match(textOf(), /Done and tested\./);
    await click(byText('button', 'Verify & Resolve')!); assert.ok(byText('button', 'Confirm Verify & Resolve')); assert.ok(byText('button', 'Cancel'));
    await click(byText('button', 'Confirm Verify & Resolve')!); await settle(server);
    assert.equal(server.count(/PATCH \/maintenance-tasks\/t-submitted\/verify/), 1);
    await until(() => !byText('button', /Verify/), 'review panel gone'); assert.match(textOf(), /Verified/);
    await unmount();
  });

  await scenario('ADMIN requests further action: reason is required, then sent', async () => {
    const { server, unmount } = await mount('admin', '/admin/tasks/t-submitted');
    await click(byText('button', 'Request Further Action')!);
    assert.ok(byText('button', 'Confirm Request')!.hasAttribute('disabled'));
    await type(label(/Reason for further action/)!, 'The photo is blurry, please retake.');
    assert.equal(byText('button', 'Confirm Request')!.hasAttribute('disabled'), false);
    await click(byText('button', 'Confirm Request')!); await settle(server);
    assert.equal(server.count(/PATCH \/maintenance-tasks\/t-submitted\/revision/), 1);
    await unmount();
  });

  await scenario('ADMIN reviews toilet requests: queue defaults to Pending, filter works, approve (QR appears), reject', async () => {
    let m = await mount('admin', '/admin/toilet-requests');
    assert.equal((label('Status') as HTMLSelectElement).value, 'PENDING', 'the review queue starts on Pending'); assert.equal(qa('main ul.grid > li').length, 1);
    await type(label('Status')!, ''); await settle(m.server); assert.equal(qa('main ul.grid > li').length, 2, 'All statuses');
    await type(label('Status')!, 'APPROVED'); await settle(m.server); assert.equal(qa('main ul.grid > li').length, 1); await m.unmount();
    m = await mount('admin', '/toilet-requests/r-1');
    await click(byText('button', 'Approve')!); await settle(m.server);
    assert.equal(m.server.count(/PATCH \/toilet-requests\/r-1\/approve/), 1); await until(() => /Registered as/.test(textOf()), 'approved view'); assert.ok(q('svg[aria-hidden="true"]'));
    await m.unmount();
    m = await mount('admin', '/toilet-requests/r-1'); await click(byText('button', 'Reject')!); await settle(m.server);
    assert.equal(m.server.count(/PATCH \/toilet-requests\/r-1\/reject/), 1); await m.unmount();
  });

  await scenario('ADMIN manages staff: form toggles (aria-expanded) and creates an account', async () => {
    const { server, unmount } = await mount('admin', '/admin/staff');
    const toggle = byText('button', 'Create Staff Account')!; assert.equal(toggle.getAttribute('aria-expanded'), 'false'); assert.equal(qa('form').length, 0);
    await click(toggle); assert.equal(byText('button', 'Cancel')!.getAttribute('aria-expanded'), 'true');
    await type(label('Name')!, 'Nina Newstaff'); await type(label('Email')!, 'nina@x.com'); await type(label('Password (min 8 characters)')!, 'password123');
    await click(q('form button[type=submit]')!); await settle(server);
    assert.equal(server.count(/POST \/admin\/staff/), 1); await until(() => /Nina Newstaff/.test(textOf()), 'new staff listed');
    await unmount();
  });

  await scenario('ADMIN toilets: QR toggle exposes state; add-toilet form validates and creates', async () => {
    let m = await mount('admin', '/admin/toilets');
    const b = byText('button', 'View QR')!; assert.equal(b.getAttribute('aria-expanded'), 'false');
    await click(b); assert.equal(byText('button', 'Hide QR')!.getAttribute('aria-expanded'), 'true'); assert.equal(qa('main li canvas').length, 1, 'the QR code canvas is rendered');
    await m.unmount();
    m = await mount('admin', '/admin/toilets/new'); assert.ok(byText('button[type=submit]', 'Create Toilet')!.hasAttribute('disabled'));
    await type(label('Location *')!, 'New Road 5'); await click(byText('button[type=submit]', 'Create Toilet')!); await settle(m.server);
    assert.equal(m.server.count(/POST \/toilets/), 1); assert.match(textOf(), /Toilet created/); assert.match(textOf(), /CC-PMC-0009/);
    await m.unmount();
  });

  await scenario('STAFF task list: cards with status badge and instruction', async () => {
    const { unmount } = await mount('staff', '/staff/tasks');
    const cards = qa('main ul.grid > li a'); assert.equal(cards.length, 5);
    assert.match(cards[0].textContent!, /TASK-t-assigned/); assert.match(cards[0].textContent!, /Fix it properly\./);
    await click(cards[0]); await settle(); assert.match(q('h1')!.textContent!, /CC-PMC-0001/);
    await unmount();
  });

  console.log('\n' + results.map(([n, ok, why]) => `${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '\n        → ' + why}`).join('\n'));
  const failed = results.filter((r) => !r[1]).length;
  console.log(`\n${results.length - failed}/${results.length} scenarios passed`);
  process.exit(failed ? 1 : 0);
}
run();
