import { ComplaintCategory, ComplaintStatus } from '@prisma/client';
import { z } from 'zod';

// POST /api/complaints
// This is submitted as multipart/form-data (to carry the optional
// image alongside it — see middleware/upload.ts), so every text field
// arrives as a string; that's why category/toiletId aren't typed any
// differently here than they'd be from JSON. toiletId accepts either
// the Toilet's own id or its cleanConnectId — complaint.service.ts
// resolves it and always stores the real Toilet.id as the foreign
// key, the same lookup toilet.service.ts's getToiletById already does.
export const createComplaintSchema = z.object({
  toiletId: z.string().min(1, 'Please select a toilet'),
  description: z
    .string()
    .trim()
    .min(10, 'Please describe the issue in at least 10 characters')
    .max(1000, 'Description is too long (max 1000 characters)'),
  // The citizen picks this themselves — there is no AI classification.
  category: z.nativeEnum(ComplaintCategory, {
    errorMap: () => ({ message: 'Please select a category' }),
  }),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

// PATCH /api/complaints/:id/status (ADMIN only)
export const updateComplaintStatusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
});

export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;

// GET /api/complaints (ADMIN only) — simple filtering, same
// non-over-engineered approach as listToiletsQuerySchema.
export const listComplaintsQuerySchema = z.object({
  status: z.nativeEnum(ComplaintStatus).optional(),
  category: z.nativeEnum(ComplaintCategory).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListComplaintsQuery = z.infer<typeof listComplaintsQuerySchema>;
