// THROWAWAY sandbox harness (not part of the deliverable). Renders the real app shell + routes in jsdom
// against a stubbed HTTP adapter that holds mutable, realistic data.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import apiClient, { AUTH_TOKEN_KEY } from '../src/api/client';
import AppFooter from '../src/components/AppFooter';
import NavBar from '../src/components/NavBar';
import { AuthProvider } from '../src/context/AuthContext';
import AppRoutes from '../src/routes/AppRoutes';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const now = '2026-10-20T10:00:00.000Z';
export type Role = 'guest' | 'citizen' | 'staff' | 'admin';

const USERS: any = {
  citizen: { id: 'u-citizen', name: 'Asha Citizen', email: 'asha@x.com', role: 'CITIZEN', createdAt: now },
  staff: { id: 'u-staff', name: 'Sam Staff', email: 'sam@x.com', role: 'STAFF', createdAt: now },
  admin: { id: 'u-admin', name: 'Ada Admin', email: 'ada@x.com', role: 'ADMIN', createdAt: now },
};
const toilet = (n: number): any => ({ id: `t-${n}`, cleanConnectId: `CC-PMC-000${n}`, externalId: `PMC-${n}`, location: `Test Road ${n}, Kasba Peth`, ward: 10 + n, type: 'Community toilet', landmark: 'Near the temple', status: 'Working', createdAt: now, updatedAt: now });
export const HEALTH = {
  score: 44, label: 'NEEDS_ATTENTION', confidence: 'SUFFICIENT', evidenceCount: 4,
  factors: [
    { key: 'OPEN_ISSUES', label: 'Open issues', points: 29.2, maxPoints: 50, detail: 'No open complaints. Credit counted at 58% because citizen ratings are low.' },
    { key: 'CITIZEN_EXPERIENCE', label: 'Citizen experience', points: 11.7, maxPoints: 40, detail: 'Average 1.3★ from 3 reviews.' },
    { key: 'VERIFIED_MAINTENANCE', label: 'Verified maintenance', points: 2.9, maxPoints: 10, detail: '1 complaint resolved and verified by an admin.' },
  ],
  notes: ['Citizen ratings are below average, so credit for having no open complaints and for past fixes is reduced to 58%.'],
};

export function makeServer(role: Role, opts: { health?: any } = {}) {
  const calls: string[] = [];
  let pending = 0;
  const toilets = [toilet(1), toilet(2), toilet(3)];
  const complaint = (id: string, n: number, status: string, category: string, withTask: any = null): any => ({
    id, complaintCode: `CMP-000${n}`, toiletId: 't-1', toilet: toilets[0], userId: 'u-citizen', description: `Problem number ${n} at the toilet`, category,
    imageUrl: n === 1 ? 'http://stub/img/c1.jpg' : null, status, createdAt: now, updatedAt: now, maintenanceTask: withTask,
  });
  const complaints: any[] = [complaint('c-1', 1, 'PENDING', 'WATER_SHORTAGE'), complaint('c-2', 2, 'IN_PROGRESS', 'CLEANLINESS'), complaint('c-3', 3, 'RESOLVED', 'OTHER')];
  const mkTask = (id: string, status: string, c: any, extra: any = {}): any => ({
    id, taskCode: `TASK-${id}`, complaintId: c.id, complaint: c, assignedStaffId: 'u-staff', assignedStaff: USERS.staff, taskInstruction: 'Fix it properly.',
    status, proofImageUrl: status === 'SUBMITTED' || status === 'VERIFIED' ? 'http://stub/img/p.jpg' : null, staffComment: null, adminComment: null,
    createdAt: now, updatedAt: now, completedAt: null, verifiedAt: null, ...extra,
  });
  const tasks: any[] = [
    mkTask('t-assigned', 'ASSIGNED', complaints[1]), mkTask('t-progress', 'IN_PROGRESS', complaints[1]),
    mkTask('t-submitted', 'SUBMITTED', complaints[1], { staffComment: 'Done and tested.' }), mkTask('t-revision', 'REVISION_REQUIRED', complaints[1], { adminComment: 'Photo unclear.' }),
    mkTask('t-verified', 'VERIFIED', complaints[2]),
  ];
  complaints[1].maintenanceTask = { id: 't-assigned', taskCode: 'TASK-t-assigned', status: 'ASSIGNED', assignedStaff: USERS.staff };
  const requests: any[] = [
    { id: 'r-1', requestCode: 'REQ-0001', userId: 'u-citizen', location: 'Kharadi bus stop', landmark: 'Bus stop', address: null, description: 'A public toilet near the stop', imageUrl: null, status: 'PENDING', adminNotes: null, resultingToiletId: null, resultingToilet: null, createdAt: now, updatedAt: now },
    { id: 'r-2', requestCode: 'REQ-0002', userId: 'u-citizen', location: 'Baner road', landmark: null, address: null, description: null, imageUrl: null, status: 'APPROVED', adminNotes: 'ok', resultingToiletId: 't-3', resultingToilet: toilets[2], createdAt: now, updatedAt: now },
  ];
  const staff = [USERS.staff];
  let reviews: any[] = [
    { id: 'rev-1', rating: 1, comment: 'Dirty, no water', userId: 'u-other', reviewerName: 'Bala', createdAt: now, updatedAt: now },
    { id: 'rev-2', rating: 2, comment: null, userId: 'u-citizen', reviewerName: 'Asha Citizen', createdAt: now, updatedAt: now },
  ];
  if (role !== 'citizen') reviews = reviews.filter((r) => r.id !== 'rev-2');
  const page = (all: any[], p: any) => ({ data: all, page: p?.page ?? 1, limit: p?.limit ?? 20, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / (p?.limit ?? 20))) });
  const fd = (d: any, k: string) => (d && typeof d.get === 'function' ? d.get(k) : null);

  apiClient.defaults.adapter = async (config: any) => {
    const url = String(config.url); const method = String(config.method).toLowerCase(); const p = config.params ?? {};
    calls.push(`${method.toUpperCase()} ${url}${config.params ? ' ' + JSON.stringify(config.params) : ''}`);
    pending++;
    try {
      await Promise.resolve();
      const ok = (data: any, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config });
      const fail = (status: number, message = 'Request failed') => { const e: any = new Error(message); e.isAxiosError = true; e.response = { status, data: { message } }; throw e; };
      const m = (re: RegExp) => url.match(re);
      let r: RegExpMatchArray | null;
      if (url === '/auth/me') return role === 'guest' ? fail(401) : ok({ user: USERS[role] });
      if (method === 'post' && url === '/auth/login') return ok({ user: USERS.citizen, token: 'tok' });
      if (method === 'get' && url === '/toilets/health') return ok({ count: 3, results: Object.fromEntries(toilets.map((t) => [t.id, { score: 44, label: 'NEEDS_ATTENTION', confidence: 'SUFFICIENT', evidenceCount: 4 }])) });
      if (method === 'get' && url === '/toilets') { const s = (p.search ?? '').toLowerCase(); return ok(page(toilets.filter((t) => !s || t.location.toLowerCase().includes(s) || t.cleanConnectId.toLowerCase().includes(s)), p)); }
      if (method === 'get' && (r = m(/^\/toilets\/([^/]+)\/health$/))) return ok({ toiletId: 't-1', cleanConnectId: 'CC-PMC-0001', health: opts.health ?? HEALTH });
      if (method === 'get' && (r = m(/^\/toilets\/([^/]+)$/))) { const t = toilets.find((x) => x.id === r![1] || x.cleanConnectId === r![1]); return t ? ok({ toilet: t }) : fail(404, 'Toilet not found'); }
      if (method === 'post' && url === '/toilets') return ok({ toilet: { ...toilet(9), cleanConnectId: 'CC-PMC-0009' } }, 201);
      if (method === 'get' && (r = m(/^\/reviews\/toilet\/(.+)$/))) { const avg = reviews.length ? reviews.reduce((s, x) => s + x.rating, 0) / reviews.length : 0; return ok({ reviews, averageRating: avg, reviewCount: reviews.length }); }
      if (method === 'post' && url.startsWith('/reviews/toilet/')) { const b = JSON.parse(config.data); const rv = { id: 'rev-new', rating: b.rating, comment: b.comment ?? null, userId: USERS[role].id, reviewerName: USERS[role].name, createdAt: now, updatedAt: now }; reviews = [rv, ...reviews]; return ok({ review: rv }, 201); }
      if (method === 'delete' && (r = m(/^\/reviews\/(.+)$/))) { reviews = reviews.filter((x) => x.id !== r![1]); return ok({}, 204); }
      if (method === 'get' && url === '/complaints/my') return ok({ complaints });
      if (method === 'get' && url === '/complaints') return ok(page(complaints.filter((c) => (!p.status || c.status === p.status) && (!p.category || c.category === p.category)), p));
      if (method === 'get' && (r = m(/^\/complaints\/([^/]+)$/))) { const c = complaints.find((x) => x.id === r![1]); return c ? ok({ complaint: c }) : fail(404); }
      if (method === 'post' && url === '/complaints') { const d = config.data; const c = complaint('c-new', 4, 'PENDING', fd(d, 'category') ?? 'OTHER'); c.description = fd(d, 'description') ?? ''; complaints.unshift(c); return ok({ complaint: c }, 201); }
      if (method === 'patch' && (r = m(/^\/complaints\/([^/]+)\/status$/))) { const c = complaints.find((x) => x.id === r![1]); c.status = JSON.parse(config.data).status; return ok({ complaint: c }); }
      if (method === 'get' && url === '/toilet-requests/my') return ok({ requests });
      if (method === 'get' && url === '/toilet-requests') return ok(page(requests.filter((x) => !p.status || x.status === p.status), p));
      if (method === 'get' && (r = m(/^\/toilet-requests\/([^/]+)$/))) { const x = requests.find((q) => q.id === r![1]); return x ? ok({ request: x }) : fail(404); }
      if (method === 'post' && url === '/toilet-requests') return ok({ request: { ...requests[0], id: 'r-new', requestCode: 'REQ-0003', location: fd(config.data, 'location') } }, 201);
      if (method === 'patch' && (r = m(/^\/toilet-requests\/([^/]+)\/(approve|reject)$/))) { const x = requests.find((q) => q.id === r![1]); x.status = r![2] === 'approve' ? 'APPROVED' : 'REJECTED'; if (r![2] === 'approve') { x.resultingToilet = toilets[0]; x.resultingToiletId = 't-1'; } return ok({ request: x }); }
      if (method === 'get' && url === '/admin/staff') return ok({ users: staff });
      if (method === 'post' && url === '/admin/staff') { const b = JSON.parse(config.data); const u = { id: 'u-new', name: b.name, email: b.email, role: 'STAFF', createdAt: now }; staff.push(u); return ok({ user: u }, 201); }
      if (method === 'get' && url === '/maintenance-tasks/my') return ok({ tasks: tasks.filter((t) => t.assignedStaffId === 'u-staff') });
      if (method === 'get' && (r = m(/^\/maintenance-tasks\/([^/]+)$/))) { const t = tasks.find((x) => x.id === r![1]); return t ? ok({ task: t }) : fail(404); }
      if (method === 'post' && url === '/maintenance-tasks') { const b = JSON.parse(config.data); const c = complaints.find((x) => x.id === b.complaintId); const t = mkTask('t-new', 'ASSIGNED', c, { taskInstruction: b.taskInstruction }); tasks.push(t); c.status = 'IN_PROGRESS'; c.maintenanceTask = { id: t.id, taskCode: t.taskCode, status: 'ASSIGNED', assignedStaff: USERS.staff }; return ok({ task: t }, 201); }
      if (method === 'patch' && (r = m(/^\/maintenance-tasks\/([^/]+)\/(start|submit|verify|revision)$/))) {
        const t = tasks.find((x) => x.id === r![1]); const act2 = r![2];
        if (act2 === 'start') t.status = 'IN_PROGRESS';
        if (act2 === 'submit') { t.status = 'SUBMITTED'; t.proofImageUrl = 'http://stub/img/p.jpg'; }
        if (act2 === 'verify') { t.status = 'VERIFIED'; t.complaint.status = 'RESOLVED'; }
        if (act2 === 'revision') { t.status = 'REVISION_REQUIRED'; t.adminComment = JSON.parse(config.data).adminComment; }
        return ok({ task: t });
      }
      return fail(404, 'stub: no handler for ' + method + ' ' + url);
    } finally { pending--; }
  };
  return { calls, count: (re: RegExp) => calls.filter((c) => re.test(c)).length, get pending() { return pending; } };
}

// ── DOM helpers ───────────────────────────────────────────────────
export const errors: string[] = [];
const realError = console.error;
console.error = (...a: any[]) => { errors.push(a.map(String).join(' ').slice(0, 300)); };
export const restoreConsole = () => { console.error = realError; };

export const tick = (ms = 12) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
export async function settle(server?: { pending: number }) { for (let i = 0; i < 4; i++) { await tick(); if (server && server.pending > 0) i = 0; } }
export async function until(cond: () => boolean, label: string, server?: any) { for (let i = 0; i < 120; i++) { if (cond()) return; await tick(); } throw new Error('timeout waiting for: ' + label + ' | page text: ' + textOf().slice(0, 160)); }
export const q = (sel: string) => document.querySelector(sel) as HTMLElement | null;
export const qa = (sel: string) => Array.from(document.querySelectorAll(sel)) as HTMLElement[];
export const textOf = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');
export const click = (el: Element) => act(async () => { (el as HTMLElement).click(); });
export const byText = (sel: string, t: string | RegExp) => qa(sel).find((e) => (typeof t === 'string' ? e.textContent?.replace(/\s+/g, ' ').trim() === t : t.test(e.textContent ?? '')));
export const label = (t: string | RegExp) => { const l = qa('label').find((x) => (typeof t === 'string' ? x.textContent?.trim() === t : t.test(x.textContent ?? ''))); return l ? (document.getElementById(l.getAttribute('for') ?? '') as HTMLInputElement) : null; };
export const type = (el: HTMLElement, value: string) => act(async () => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
});
export const setFile = (el: HTMLElement, file: File) => act(async () => { Object.defineProperty(el, 'files', { value: [file], configurable: true }); el.dispatchEvent(new Event('change', { bubbles: true })); });

export async function mount(role: Role, path: string, opts: any = {}) {
  document.body.innerHTML = '<div id="root"></div>'; localStorage.clear(); errors.length = 0;
  if (role !== 'guest') localStorage.setItem(AUTH_TOKEN_KEY, 'stub-token');
  const server = makeServer(role, opts);
  const root = createRoot(document.getElementById('root')!);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <NavBar />
            <main id="main-content" className="flex-1"><AppRoutes /></main>
            <AppFooter />
          </div>
        </AuthProvider>
      </MemoryRouter>
    );
  });
  await settle(server);
  return { server, unmount: () => act(async () => root.unmount()) };
}

export const results: [string, boolean, string][] = [];
export async function scenario(name: string, fn: () => Promise<void>) {
  try { await fn(); if (errors.length) throw new Error('console.error: ' + errors[0]); results.push([name, true, '']); }
  catch (e: any) { results.push([name, false, String(e?.message ?? e).split('\n').slice(0, 5).join(' ⏎ ').slice(0, 420)]); }
}
