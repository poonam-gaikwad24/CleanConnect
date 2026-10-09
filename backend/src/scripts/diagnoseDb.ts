// READ-ONLY diagnostic: which database does the backend actually use,
// and does it contain Toilet rows?
//
// Copy to:  backend/src/scripts/diagnoseDb.ts
// Run from: backend/        npx tsx src/scripts/diagnoseDb.ts
//
// Safety: issues only SELECT statements. Never prints the password or
// the full connection string. Writes nothing. Safe to delete afterwards.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseDotenv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

type Safe = { host: string; port: string; database: string; schema: string };

function describeUrl(raw: string | undefined): Safe | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return {
      host: u.hostname,
      port: u.port || '5432 (default)',
      database: decodeURIComponent(u.pathname.replace(/^\//, '')),
      schema: u.searchParams.get('schema') ?? 'public (default)',
    };
  } catch {
    return null;
  }
}

function withDatabase(raw: string, db: string): string {
  const u = new URL(raw);
  u.pathname = '/' + encodeURIComponent(db);
  return u.toString();
}

const q = (ident: string) => '"' + ident.replace(/"/g, '""') + '"';

async function tryRows<T>(p: PrismaClient, sql: string): Promise<T[] | { error: string }> {
  try {
    return (await p.$queryRawUnsafe(sql)) as T[];
  } catch (e: any) {
    return { error: String(e?.message ?? e).split('\n').pop() ?? 'unknown error' };
  }
}

async function main() {
  const effective = process.env.DATABASE_URL;
  console.log('=== 1. Which DATABASE_URL is the backend using? ===');
  console.log('Effective (process.env):', describeUrl(effective) ?? 'MISSING/INVALID');

  // dotenv never overrides a variable that is already set in the shell /
  // OS environment, so a stale shell-level DATABASE_URL silently wins
  // over backend/.env. Compare the two.
  const envFile = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envFile)) {
    const fromFile = parseDotenv(fs.readFileSync(envFile)).DATABASE_URL;
    const a = describeUrl(fromFile);
    const b = describeUrl(effective);
    console.log('.env file value        :', a ?? 'not set in .env');
    if (a && b && JSON.stringify(a) !== JSON.stringify(b)) {
      console.log('⚠️  MISMATCH: a DATABASE_URL set in your shell/OS environment is');
      console.log('   overriding backend/.env. The backend is NOT using the .env database.');
    } else if (a && b) {
      console.log('✔ .env and effective value agree (host/port/db/schema).');
    }
  } else {
    console.log(`No .env found in ${process.cwd()} (run this from backend/).`);
  }

  if (!effective) process.exit(1);
  const prisma = new PrismaClient();

  try {
    console.log('\n=== 2. Connected server / database / schema ===');
    console.log(
      await prisma.$queryRawUnsafe(
        `SELECT current_database() AS database, current_schema() AS schema,
                inet_server_port()::int AS port, split_part(version(), ' ', 2) AS pg_version`
      )
    );

    console.log('\n=== 3. Row counts in the connected schema ===');
    for (const t of ['Toilet', 'User', 'Complaint', 'ToiletRegistrationRequest', 'MaintenanceTask', 'Review']) {
      const r = await tryRows<{ n: number }>(prisma, `SELECT count(*)::int AS n FROM ${q(t)}`);
      console.log(`${t.padEnd(28)}`, Array.isArray(r) ? r[0].n : `UNREADABLE → ${r.error}`);
    }

    console.log('\n=== 4. Toilet detail ===');
    console.log(
      await tryRows(
        prisma,
        `SELECT count(*)::int AS total,
                count("cleanConnectId")::int AS with_cleanconnect_id,
                count("externalId")::int AS with_external_id,
                min("createdAt") AS oldest, max("createdAt") AS newest
         FROM "Toilet"`
      )
    );

    console.log('\n=== 5. Migration history (_prisma_migrations) ===');
    console.log(
      await tryRows(
        prisma,
        `SELECT migration_name, started_at, finished_at, rolled_back_at
         FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10`
      )
    );

    console.log('\n=== 6. Does a "Toilet" table exist in OTHER schemas of this database? ===');
    const schemas = await tryRows<{ table_schema: string }>(
      prisma,
      `SELECT table_schema FROM information_schema.tables WHERE table_name = 'Toilet' ORDER BY 1`
    );
    if (Array.isArray(schemas)) {
      for (const s of schemas) {
        const r = await tryRows<{ n: number }>(prisma, `SELECT count(*)::int AS n FROM ${q(s.table_schema)}."Toilet"`);
        console.log(`schema ${s.table_schema.padEnd(20)} Toilet rows:`, Array.isArray(r) ? r[0].n : r.error);
      }
    } else console.log(schemas);

    console.log('\n=== 7. Same check in every OTHER database on this server ===');
    const dbs = await tryRows<{ datname: string }>(
      prisma,
      `SELECT datname FROM pg_database WHERE NOT datistemplate AND datallowconn ORDER BY 1`
    );
    if (Array.isArray(dbs)) {
      for (const { datname } of dbs) {
        const other = new PrismaClient({ datasourceUrl: withDatabase(effective, datname) });
        try {
          const tbls = (await other.$queryRawUnsafe(
            `SELECT table_schema FROM information_schema.tables WHERE table_name = 'Toilet'`
          )) as { table_schema: string }[];
          if (tbls.length === 0) {
            console.log(`db ${datname.padEnd(24)} (no Toilet table)`);
          }
          for (const t of tbls) {
            const r = (await other.$queryRawUnsafe(
              `SELECT count(*)::int AS n FROM ${q(t.table_schema)}."Toilet"`
            )) as { n: number }[];
            console.log(`db ${datname.padEnd(24)} schema ${t.table_schema.padEnd(14)} Toilet rows: ${r[0].n}`);
          }
        } catch (e: any) {
          console.log(`db ${datname.padEnd(24)} (cannot inspect: ${String(e?.message ?? e).split('\n').pop()})`);
        } finally {
          await other.$disconnect();
        }
      }
    } else console.log(dbs);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Diagnostic failed:', e?.message ?? e);
  process.exitCode = 1;
});
