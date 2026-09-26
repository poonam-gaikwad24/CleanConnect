import { z } from 'zod';

// GET /api/toilets — simple, non-over-engineered filtering.
// search checks cleanConnectId/location/landmark (see toilet.service.ts)
// — the minimal query param needed for a future complaint form's
// "search by address / area / CleanConnect ID" flow.
export const listToiletsQuerySchema = z.object({
  ward: z.coerce.number().int().positive().optional(),
  type: z.string().min(1).optional(),
  search: z.string().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListToiletsQuery = z.infer<typeof listToiletsQuerySchema>;

// GET /api/toilets/nearby
export const nearbyToiletsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(50).default(5),
});

export type NearbyToiletsQuery = z.infer<typeof nearbyToiletsQuerySchema>;

// POST /api/toilets (ADMIN)
// Coordinates are optional and must NEVER be defaulted/invented by the
// server if omitted — a toilet created without them simply has
// latitude/longitude = null and stays that way; Module 4 does not
// depend on them at all. cleanConnectId is deliberately NOT a field
// here — it's always server-generated (see toilet.service.ts), never
// accepted from the client.
// externalId is optional (Module 6): a toilet created directly by an
// admin, or created by approving a ToiletRegistrationRequest, has no
// PMC source record — CleanConnect never invents one. It remains
// required in spirit for CSV-imported rows (importToilets.ts always
// supplies it), just not enforced at the schema/validator level since
// this same endpoint now serves both origins.
export const createToiletSchema = z.object({
  externalId: z.string().min(1).optional(),
  ward: z.number().int().positive().nullable().optional(),
  type: z.string().min(1).nullable().optional(),
  location: z.string().min(1, 'location is required'),
  landmark: z.string().min(1).nullable().optional(),
  status: z.string().min(1).nullable().optional(),
  isMonetized: z.boolean().nullable().optional(),
  hasIct: z.boolean().nullable().optional(),
  hasGoogleMapsListing: z.boolean().nullable().optional(),
  hasIec: z.boolean().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export type CreateToiletInput = z.infer<typeof createToiletSchema>;

// PUT /api/toilets/:id (ADMIN) — every field optional; externalId is
// intentionally excluded from update (it's the dataset's stable key).
export const updateToiletSchema = createToiletSchema
  .omit({ externalId: true })
  .partial();

export type UpdateToiletInput = z.infer<typeof updateToiletSchema>;
