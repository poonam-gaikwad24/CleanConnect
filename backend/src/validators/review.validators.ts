import { z } from 'zod';

// Shared by POST /api/reviews/toilet/:toiletId and PUT /api/reviews/:id
// — an edit resubmits the full rating (+ optional comment), the same
// shape as creating one, rather than a partial patch. Plain JSON (no
// image involved — Module 8 is explicitly text-only), so no multer
// step before this runs, unlike complaints/registration-requests.
export const reviewSchema = z.object({
  rating: z
    .number({ invalid_type_error: 'Rating must be a number' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  // An empty/whitespace-only string is treated as "no comment" rather
  // than rejected outright — friendlier than erroring on something the
  // user didn't really mean to submit as a comment.
  comment: z
    .string()
    .trim()
    .max(500, 'Review is too long (max 500 characters)')
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
