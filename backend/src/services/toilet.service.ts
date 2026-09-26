import { Prisma, Toilet } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { formatCleanConnectId } from '../utils/cleanConnectId';
import { CreateToiletInput, ListToiletsQuery, UpdateToiletInput } from '../validators/toilet.validators';

export interface PaginatedToilets {
  data: Toilet[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listToilets(query: ListToiletsQuery): Promise<PaginatedToilets> {
  const where: Prisma.ToiletWhereInput = {};

  if (query.ward !== undefined) {
    where.ward = query.ward;
  }

  if (query.type !== undefined) {
    where.type = query.type;
  }

  // Small, single filter — supports the future Complaint form's
  // "search by address / area / CleanConnect ID" flow by reusing this
  // existing endpoint rather than adding a new one.
  if (query.search !== undefined) {
    where.OR = [
      { cleanConnectId: { contains: query.search, mode: 'insensitive' } },
      { location: { contains: query.search, mode: 'insensitive' } },
      { landmark: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    prisma.toilet.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.toilet.count({ where }),
  ]);

  return {
    data,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

// Accepts either the internal Prisma id (UUID) or the public
// cleanConnectId (e.g. "CC-PMC-0001") — the latter is what a QR code
// or shared link would use, per Module 4's identity design. Building
// the QR feature itself is out of scope for this module; this just
// makes sure the id it would encode actually resolves.
export async function getToiletById(idOrCleanConnectId: string): Promise<Toilet> {
  const toilet = await prisma.toilet.findFirst({
    where: {
      OR: [{ id: idOrCleanConnectId }, { cleanConnectId: idOrCleanConnectId }],
    },
  });

  if (!toilet) {
    throw new AppError('Toilet not found', 404);
  }

  return toilet;
}

export interface NearbyToilet extends Toilet {
  distanceKm: number;
}

// Haversine distance, computed in SQL so Postgres does the filtering
// and sorting rather than pulling every toilet into Node. At ~986 rows
// this is comfortably fast without PostGIS — see Module 3 architecture
// analysis for why PostGIS wasn't used.
//
// Only toilets with non-null coordinates are considered; toilets
// without coordinates are never included in nearby results (they
// remain reachable via GET /api/toilets and GET /api/toilets/:id).
export async function findNearbyToilets(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<NearbyToilet[]> {
  // Subquery computes distanceKm; outer query filters/sorts on the
  // alias. (A single-level SELECT can't filter on its own alias in
  // the WHERE clause due to SQL's logical evaluation order, so the
  // subquery is the standard, unambiguous way to do this.)
  const results = await prisma.$queryRaw<NearbyToilet[]>`
    SELECT * FROM (
      SELECT *,
        (
          6371 * acos(
            LEAST(1, GREATEST(-1,
              cos(radians(${lat})) * cos(radians("latitude")) *
              cos(radians("longitude") - radians(${lng})) +
              sin(radians(${lat})) * sin(radians("latitude"))
            ))
          )
        ) AS "distanceKm"
      FROM "Toilet"
      WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL
    ) AS toilets_with_distance
    WHERE "distanceKm" <= ${radiusKm}
    ORDER BY "distanceKm" ASC
  `;

  return results;
}

// Pure formatting logic — deliberately separated (in utils/cleanConnectId.ts)
// so it can be unit-tested without touching Prisma.

// Generates the next sequential CleanConnect ID, e.g. "CC-PMC-0001".
// Deterministic and stable: based on how many toilets already HAVE an
// id assigned, not on request timing or randomness. A toilet that
// already has a cleanConnectId is never touched again (see
// importToilets.ts and updateToilet below), so re-running the import,
// or creating new toilets later via the admin API, only ever hands
// out ids to rows that don't have one yet — existing PMC ID -> CC-PMC
// mappings never change.
//
// Note: this does a fresh COUNT per call, which is intentionally
// simple rather than using a DB sequence/transaction. At this
// project's scale (hundreds of rows, no concurrent import/admin
// writes in practice) that's a reasonable trade-off; it would need
// hardening (e.g. a serializable transaction or a Postgres sequence)
// if concurrent writers became a real concern.
export async function getNextCleanConnectId(): Promise<string> {
  const count = await prisma.toilet.count({ where: { cleanConnectId: { not: null } } });
  return formatCleanConnectId(count + 1);
}

export async function createToilet(input: CreateToiletInput): Promise<Toilet> {
  // externalId is optional (Module 6: admin-direct-created toilets and
  // toilets created by approving a ToiletRegistrationRequest have no
  // PMC source record). The duplicate check only makes sense — and is
  // only run — when one was actually supplied; Postgres's unique
  // constraint on a nullable column already allows any number of rows
  // with externalId = NULL, so there's nothing to check otherwise.
  if (input.externalId) {
    const existing = await prisma.toilet.findUnique({ where: { externalId: input.externalId } });

    if (existing) {
      throw new AppError('A toilet with this externalId already exists', 409);
    }
  }

  // cleanConnectId is never accepted from the request body (it isn't
  // part of CreateToiletInput at all) — always server-generated, same
  // reasoning as Module 2 never trusting a client-supplied role. This
  // is the ONLY CleanConnect ID generation path in the codebase — used
  // identically whether this function is called from the admin
  // "create toilet" endpoint or from toiletRequest.service.ts's
  // approveRequest().
  const cleanConnectId = await getNextCleanConnectId();

  return prisma.toilet.create({ data: { ...input, cleanConnectId } });
}

export async function updateToilet(id: string, input: UpdateToiletInput): Promise<Toilet> {
  const existing = await prisma.toilet.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError('Toilet not found', 404);
  }

  return prisma.toilet.update({ where: { id }, data: input });
}

export async function deleteToilet(id: string): Promise<void> {
  const existing = await prisma.toilet.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError('Toilet not found', 404);
  }

  await prisma.toilet.delete({ where: { id } });
}
