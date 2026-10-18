// Run:  npx tsx --test tests/api.test.ts
//
// HTTP-level tests of the REAL Express app (routes, JWT middleware,
// validation, controllers, services) with ONE thing replaced: the
// Prisma client in src/config/db is swapped for a small in-memory
// stub. Consequences you should know about:
//   • It never touches your PostgreSQL database — safe to run anywhere.
//   • It verifies routing, authorization, validation, response shape,
//     and that the services pass sensible filters. It does NOT prove
//     the real Prisma/SQL behaves identically to the stub — see the
//     manual database checks in the Module 9 handover for that.
//
// Static imports are deliberately avoided for app code: they would
// load the real db module before the stub is installed.
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'node:test';

// ── fixtures ──────────────────────────────────────────────────────
const T1 = 'aaaaaaaa-0000-4000-8000-000000000001'; // reviews + open water complaint + 1 verified fix
const T2 = 'aaaaaaaa-0000-4000-8000-000000000002'; // same reviews, no complaints
const T3 = 'aaaaaaaa-0000-4000-8000-000000000003'; // no data at all
const MISSING = 'aaaaaaaa-0000-4000-8000-0000000000ff';

const USERS = {
  citizenA: { id: 'u-citizen-a', role: 'CITIZEN', name: 'Asha Patil' },
  citizenB: { id: 'u-citizen-b', role: 'CITIZEN', name: 'Bala Rao' },
  citizenC: { id: 'u-citizen-c', role: 'CITIZEN', name: 'Chitra Nair' },
  admin: { id: 'u-admin', role: 'ADMIN', name: 'Admin' },
  staff: { id: 'u-staff', role: 'STAFF', name: 'Sam Staff' },
} as const;

type Row = Record<string, any>;

function freshData() {
  return {
    toilets: [
      { id: T1, cleanConnectId: 'CC-PMC-0001' },
      { id: T2, cleanConnectId: 'CC-PMC-0002' },
      { id: T3, cleanConnectId: 'CC-PMC-0003' },
    ] as Row[],
    reviews: [
      { id: 'rev-a', toiletId: T1, userId: USERS.citizenA.id, rating: 5, comment: 'secret-comment-A' },
      { id: 'rev-b', toiletId: T1, userId: USERS.citizenB.id, rating: 5, comment: null },
      { id: 'rev-c', toiletId: T1, userId: USERS.citizenC.id, rating: 4, comment: null },
      { id: 'rev-s', toiletId: T1, userId: USERS.staff.id, rating: 3, comment: null }, // a review owned by STAFF
      { id: 'rev-d', toiletId: T2, userId: USERS.citizenA.id, rating: 5, comment: null },
      { id: 'rev-e', toiletId: T2, userId: USERS.citizenB.id, rating: 5, comment: null },
      { id: 'rev-f', toiletId: T2, userId: USERS.citizenC.id, rating: 4, comment: null },
      { id: 'rev-g', toiletId: T2, userId: USERS.staff.id, rating: 3, comment: null },
    ] as Row[],
    complaints: [
      { id: 'c1', toiletId: T1, category: 'WATER_SHORTAGE', status: 'PENDING', description: 'private-description-1', complaintCode: 'CMP-0001' },
      { id: 'c2', toiletId: T1, category: 'CLEANLINESS', status: 'RESOLVED', description: 'private-description-2', complaintCode: 'CMP-0002' },
    ] as Row[],
    tasks: [{ id: 'k2', complaintId: 'c2', status: 'VERIFIED' }] as Row[],
  };
}

// ── in-memory Prisma stand-in (only what the code under test calls) ──
let data = freshData();

const inList = (v: unknown, cond: any) => (cond?.in ? cond.in.includes(v) : true);
const taskOf = (complaintId: string) => data.tasks.find((t) => t.complaintId === complaintId) ?? null;

const fakePrisma = {
  __isFake: true,
  toilet: {
    findFirst: async ({ where }: any) =>
      data.toilets.find((t) =>
        (where.OR as Row[]).some((c) => (c.id && c.id === t.id) || (c.cleanConnectId && c.cleanConnectId === t.cleanConnectId))
      ) ?? null,
    findMany: async ({ where }: any) => data.toilets.filter((t) => inList(t.id, where.id)).map((t) => ({ id: t.id })),
  },
  review: {
    groupBy: async ({ where }: any) => {
      const byToilet = new Map<string, number[]>();
      for (const r of data.reviews.filter((r) => inList(r.toiletId, where.toiletId))) {
        byToilet.set(r.toiletId, [...(byToilet.get(r.toiletId) ?? []), r.rating]);
      }
      return [...byToilet.entries()].map(([toiletId, ratings]) => ({
        toiletId,
        _avg: { rating: ratings.reduce((a, b) => a + b, 0) / ratings.length },
        _count: { _all: ratings.length },
      }));
    },
    findUnique: async ({ where }: any) => {
      const r = data.reviews.find((x) => x.id === where.id);
      if (!r) return null;
      const u = Object.values(USERS).find((x) => x.id === r.userId);
      return { ...r, user: { name: u?.name ?? 'Unknown' } };
    },
    delete: async ({ where }: any) => {
      data.reviews = data.reviews.filter((r) => r.id !== where.id);
      return {};
    },
  },
  complaint: {
    groupBy: async ({ where }: any) => {
      let rows = data.complaints.filter((c) => inList(c.toiletId, where.toiletId));
      if (where.status) rows = rows.filter((c) => c.status === where.status);
      if (where.maintenanceTask?.is) {
        rows = rows.filter((c) => taskOf(c.id)?.status === where.maintenanceTask.is.status);
      }
      const counts = new Map<string, number>();
      for (const c of rows) counts.set(c.toiletId, (counts.get(c.toiletId) ?? 0) + 1);
      return [...counts.entries()].map(([toiletId, n]) => ({ toiletId, _count: { _all: n } }));
    },
    findMany: async ({ where }: any) =>
      data.complaints
        .filter((c) => inList(c.toiletId, where.toiletId) && c.status !== where.status.not)
        .map((c) => ({
          toiletId: c.toiletId,
          category: c.category,
          status: c.status,
          maintenanceTask: taskOf(c.id) ? { status: taskOf(c.id)!.status } : null,
        })),
  },
};

// ── harness ───────────────────────────────────────────────────────
let baseUrl = '';
let server: import('node:http').Server;
let tokenFor: (u: { id: string; role: string }) => string;
let calculateToiletHealth: typeof import('../src/utils/toiletHealth').calculateToiletHealth;
const realConsoleError = console.error;

async function call(method: string, path: string, user?: { id: string; role: string }) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: user ? { Authorization: `Bearer ${tokenFor(user)}` } : {},
  });
  const text = await res.text();
  return { status: res.status, text, body: text ? JSON.parse(text) : null };
}

before(async () => {
  process.env.DATABASE_URL = 'postgresql://stub:stub@localhost:5432/stub'; // never connected to
  process.env.JWT_SECRET = 'test-secret-test-secret-0123456789';
  process.env.FRONTEND_URL = 'http://localhost:5173';

  const dbPath = require.resolve('../src/config/db');
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { prisma: fakePrisma },
    children: [],
    paths: [],
  } as unknown as NodeJS.Module;

  // Safety net: refuse to run a single request if the stub did not take.
  const loaded = require('../src/config/db').prisma;
  assert.equal(loaded.__isFake, true, 'Prisma stub was not installed — aborting to protect real data');

  const { app } = require('../src/app') as typeof import('../src/app');
  const { signToken } = require('../src/utils/jwt') as typeof import('../src/utils/jwt');
  calculateToiletHealth = (require('../src/utils/toiletHealth') as typeof import('../src/utils/toiletHealth')).calculateToiletHealth;
  tokenFor = (u) => signToken({ sub: u.id, role: u.role as never });

  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  console.error = () => undefined; // errorHandler logs every AppError; keep test output readable
});

after(() => {
  console.error = realConsoleError;
  server?.close();
});

beforeEach(() => {
  data = freshData();
});

// ── Task 2: health endpoints ──────────────────────────────────────
describe('GET /api/toilets/:id/health', () => {
  it('returns the documented response shape and the correct score', async () => {
    const { status, body } = await call('GET', `/api/toilets/${T1}/health`);
    assert.equal(status, 200);
    assert.deepEqual(Object.keys(body).sort(), ['cleanConnectId', 'health', 'toiletId']);
    assert.equal(body.toiletId, T1);
    assert.equal(body.cleanConnectId, 'CC-PMC-0001');
    assert.deepEqual(Object.keys(body.health).sort(), [
      'confidence', 'evidenceCount', 'factors', 'label', 'notes', 'score',
    ]);

    // Expected value built by hand from the fixtures above, independent of the service:
    // 4 reviews (5,5,4,3 → avg 4.25), 2 complaints, 1 open water (PENDING, no task), 1 verified fix.
    const expected = calculateToiletHealth({
      reviewCount: 4,
      averageRating: 4.25,
      totalComplaints: 2,
      openComplaints: [{ category: 'WATER_SHORTAGE', status: 'PENDING', taskStatus: null }],
      verifiedFixes: 1,
    });
    assert.deepEqual(body.health, JSON.parse(JSON.stringify(expected)));
    assert.equal(body.health.factors.length, 3);
  });

  it('also resolves by CleanConnect ID (QR / shared link form)', async () => {
    const { status, body } = await call('GET', '/api/toilets/CC-PMC-0001/health');
    assert.equal(status, 200);
    assert.equal(body.toiletId, T1);
  });

  it('is public (no token needed) and exposes no private citizen data', async () => {
    const { status, text } = await call('GET', `/api/toilets/${T1}/health`);
    assert.equal(status, 200);
    for (const secret of ['u-citizen-a', 'secret-comment-A', 'private-description', 'CMP-0001', 'Asha', 'email']) {
      assert.ok(!text.includes(secret), `response leaked "${secret}"`);
    }
  });

  it('a toilet with no data returns 200 with a null score, not an error or a fake number', async () => {
    const { status, body } = await call('GET', `/api/toilets/${T3}/health`);
    assert.equal(status, 200);
    assert.equal(body.health.score, null);
    assert.equal(body.health.label, null);
    assert.equal(body.health.confidence, 'INSUFFICIENT');
    assert.deepEqual(body.health.factors, []);
  });

  it('unknown but well-formed id → 404', async () => {
    const { status, body } = await call('GET', `/api/toilets/${MISSING}/health`);
    assert.equal(status, 404);
    assert.equal(body.message, 'Toilet not found');
  });

  it('malformed ids → 400 before any lookup', async () => {
    for (const bad of ['bad%20id', '%3Cscript%3E', 'a'.repeat(65), 'x;DROP']) {
      const { status, body } = await call('GET', `/api/toilets/${bad}/health`);
      assert.equal(status, 400, `expected 400 for "${bad}"`);
      assert.equal(body.message, 'Invalid toilet id');
    }
  });

  it('same star rating, different health: T1 vs T2 differ because of complaints', async () => {
    const t1 = (await call('GET', `/api/toilets/${T1}/health`)).body.health;
    const t2 = (await call('GET', `/api/toilets/${T2}/health`)).body.health;
    // Both have identical reviews (avg 4.25 over 4). Only complaints differ.
    assert.ok(t2.score > t1.score, `${t2.score} should exceed ${t1.score}`);
  });

  it('a poorly-rated toilet with no complaints is not scored as healthy, and the API says why', async () => {
    // Three 1★/1★/2★ reviews, no complaints at all — the shape of the CC-PMC-0001 problem.
    data.toilets.push({ id: 'aaaaaaaa-0000-4000-8000-000000000004', cleanConnectId: 'CC-PMC-0004' });
    data.reviews.push(
      { id: 'p1', toiletId: 'aaaaaaaa-0000-4000-8000-000000000004', userId: USERS.citizenA.id, rating: 1, comment: null },
      { id: 'p2', toiletId: 'aaaaaaaa-0000-4000-8000-000000000004', userId: USERS.citizenB.id, rating: 1, comment: null },
      { id: 'p3', toiletId: 'aaaaaaaa-0000-4000-8000-000000000004', userId: USERS.citizenC.id, rating: 2, comment: null },
    );
    const { status, body } = await call('GET', '/api/toilets/CC-PMC-0004/health');
    assert.equal(status, 200);
    assert.equal(body.health.label, 'NEEDS_ATTENTION');
    assert.ok(body.health.score < 50);
    assert.ok(body.health.notes.some((n: string) => /reduced to/.test(n)), 'the reduction must be explained');
    // explanation agrees with the number
    const sumTenths = body.health.factors.reduce((s: number, f: any) => s + Math.round(f.points * 10), 0);
    assert.equal(Math.round(sumTenths / 10), body.health.score);
  });

  it('reflects a complaint being resolved and verified (same endpoint, new database state)', async () => {
    const before = (await call('GET', `/api/toilets/${T1}/health`)).body.health;
    data.complaints.find((c) => c.id === 'c1')!.status = 'RESOLVED';
    data.tasks.push({ id: 'k1', complaintId: 'c1', status: 'VERIFIED' });
    const after = (await call('GET', `/api/toilets/${T1}/health`)).body.health;
    assert.ok(after.score > before.score);
    assert.equal(after.factors.find((f: any) => f.key === 'OPEN_ISSUES').points, 50);
    assert.equal(after.factors.find((f: any) => f.key === 'VERIFIED_MAINTENANCE').points, 10);
  });
});

describe('GET /api/toilets/health?ids=…', () => {
  it('returns summaries only, keyed by toilet id, and is not shadowed by /:id', async () => {
    const { status, body } = await call('GET', `/api/toilets/health?ids=${T1},${T2},${T3}`);
    assert.equal(status, 200);
    assert.equal(body.count, 3);
    assert.deepEqual(Object.keys(body.results).sort(), [T1, T2, T3].sort());
    assert.deepEqual(Object.keys(body.results[T1]).sort(), ['confidence', 'evidenceCount', 'label', 'score']);
    assert.equal(body.results[T3].score, null);
  });

  it('omits ids that match no toilet instead of fabricating an "insufficient" entry', async () => {
    const { body } = await call('GET', `/api/toilets/health?ids=${T1},${MISSING}`);
    assert.equal(body.count, 1);
    assert.ok(!(MISSING in body.results));
  });

  it('collapses duplicate and blank ids', async () => {
    const { status, body } = await call('GET', `/api/toilets/health?ids=${T1},${T1},,${T1}`);
    assert.equal(status, 200);
    assert.equal(body.count, 1);
  });

  it('validation: missing / empty / malformed / too many ids → 400', async () => {
    assert.equal((await call('GET', '/api/toilets/health')).status, 400);
    assert.equal((await call('GET', '/api/toilets/health?ids=')).status, 400);
    assert.equal((await call('GET', '/api/toilets/health?ids=,,')).status, 400);
    assert.equal((await call('GET', `/api/toilets/health?ids=${T1},bad%20id`)).status, 400);
    const fiftyOne = Array.from({ length: 51 }, (_, i) => `id-${i}`).join(',');
    const tooMany = await call('GET', `/api/toilets/health?ids=${fiftyOne}`);
    assert.equal(tooMany.status, 400);
    const fifty = Array.from({ length: 50 }, (_, i) => `id-${i}`).join(',');
    assert.equal((await call('GET', `/api/toilets/health?ids=${fifty}`)).status, 200);
  });
});

// ── Task 1: review deletion permissions ───────────────────────────
describe('DELETE /api/reviews/:id — permissions by role', () => {
  const exists = (id: string) => data.reviews.some((r) => r.id === id);

  it('no token → 401, nothing deleted', async () => {
    assert.equal((await call('DELETE', '/api/reviews/rev-a')).status, 401);
    assert.ok(exists('rev-a'));
  });

  it('CITIZEN can delete their own review → 204', async () => {
    assert.equal((await call('DELETE', '/api/reviews/rev-a', USERS.citizenA)).status, 204);
    assert.ok(!exists('rev-a'));
  });

  it("CITIZEN cannot delete someone else's review → 403, review kept", async () => {
    const r = await call('DELETE', '/api/reviews/rev-b', USERS.citizenA);
    assert.equal(r.status, 403);
    assert.ok(exists('rev-b'));
  });

  it("ADMIN can delete any citizen's review → 204", async () => {
    assert.equal((await call('DELETE', '/api/reviews/rev-b', USERS.admin)).status, 204);
    assert.ok(!exists('rev-b'));
  });

  it("STAFF cannot delete a citizen's review → 403, review kept", async () => {
    const r = await call('DELETE', '/api/reviews/rev-a', USERS.staff);
    assert.equal(r.status, 403);
    assert.ok(exists('rev-a'));
  });

  it('STAFF cannot delete even a review they own → 403, review kept', async () => {
    const r = await call('DELETE', '/api/reviews/rev-s', USERS.staff);
    assert.equal(r.status, 403);
    assert.ok(exists('rev-s'));
  });

  it('deleting a non-existent review → 404 (admin)', async () => {
    assert.equal((await call('DELETE', '/api/reviews/does-not-exist', USERS.admin)).status, 404);
  });

  it('after an admin deletion the health score input (review count) updates accordingly', async () => {
    const before = (await call('GET', `/api/toilets/${T1}/health`)).body.health;
    await call('DELETE', '/api/reviews/rev-a', USERS.admin);
    const after = (await call('GET', `/api/toilets/${T1}/health`)).body.health;
    assert.equal(before.evidenceCount - after.evidenceCount, 1);
  });
});
