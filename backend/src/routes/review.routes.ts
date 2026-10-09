import { Router } from 'express';
import { Role } from '@prisma/client';
import * as reviewController from '../controllers/review.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { reviewSchema } from '../validators/review.validators';

const router = Router();

// Public — same as GET /api/toilets and GET /api/toilets/:id, reviews
// are something anyone browsing toilets should be able to see without
// logging in. Only create/update/delete require authentication, set
// per-route below (unlike complaint.routes.ts/toiletRequest.routes.ts,
// which gate the whole router with router.use(authenticate) since
// none of their data is public).
router.get('/toilet/:toiletId', reviewController.listForToilet);

// CITIZEN-only: one review per citizen per toilet is enforced in
// review.service.ts (and backstopped by the @@unique constraint in
// schema.prisma).
router.post(
  '/toilet/:toiletId',
  authenticate,
  authorize(Role.CITIZEN),
  validate(reviewSchema),
  reviewController.create
);

// Owner-only (not admin) — enforced inside review.service.ts, since it
// depends on the specific review's userId, not just role.
router.put('/:id', authenticate, validate(reviewSchema), reviewController.update);

// Owner or ADMIN — also enforced inside review.service.ts.
router.delete('/:id', authenticate, reviewController.remove);

export default router;
