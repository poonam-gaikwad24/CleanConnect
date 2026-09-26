import { RequestStatus } from '@prisma/client';
import { z } from 'zod';

// POST /api/toilet-requests (CITIZEN)
// Submitted as multipart/form-data (to carry the optional evidence
// photo — see middleware/upload.ts), so every field arrives as a
// string. Deliberately NO latitude/longitude/GPS field anywhere here
// — Module 6 explicitly keeps this to human-readable location text,
// same as the rest of CleanConnect (see toilet.service.ts's comments
// on why coordinates are never invented).
export const createToiletRequestSchema = z.object({
  location: z.string().trim().min(1, 'Please describe the location or area'),
  landmark: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  description: z.string().trim().max(1000, 'Description is too long (max 1000 characters)').optional(),
});

export type CreateToiletRequestInput = z.infer<typeof createToiletRequestSchema>;

// PATCH /api/toilet-requests/:id/approve or /reject (ADMIN only).
// Status itself is implied by which endpoint is called (see
// toiletRequest.routes.ts) — this schema only covers the optional
// note an admin can attach either way.
export const reviewToiletRequestSchema = z.object({
  adminNotes: z.string().trim().max(500, 'Notes are too long (max 500 characters)').optional(),
});

export type ReviewToiletRequestInput = z.infer<typeof reviewToiletRequestSchema>;

// GET /api/toilet-requests (ADMIN) — simple filtering, same
// non-over-engineered approach as listComplaintsQuerySchema.
export const listToiletRequestsQuerySchema = z.object({
  status: z.nativeEnum(RequestStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListToiletRequestsQuery = z.infer<typeof listToiletRequestsQuerySchema>;
