import { Router } from 'express';
import { Role } from '@prisma/client';
import * as toiletRequestController from '../controllers/toiletRequest.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate, validateQuery } from '../middleware/validate';
import { handleSingleImageUpload } from '../middleware/upload';
import {
  createToiletRequestSchema,
  listToiletRequestsQuerySchema,
  reviewToiletRequestSchema,
} from '../validators/toiletRequest.validators';

const router = Router();

// Every route here requires a signed-in user — same as complaints,
// there is no public registration-request data.
router.use(authenticate);

// /my before /:id so "my" is never captured as an :id param — same
// pattern used throughout the project (toilet.routes.ts's /nearby,
// complaint.routes.ts's /my).
router.get('/my', toiletRequestController.my);

// Admin-only: view every citizen's registration requests.
router.get(
  '/',
  authorize(Role.ADMIN),
  validateQuery(listToiletRequestsQuerySchema),
  toiletRequestController.list
);

// Citizen-only: request a toilet be added. handleSingleImageUpload
// (multer) must run before validate() so the multipart body's text
// fields have already been parsed into req.body by the time Zod sees
// them — same ordering as POST /api/complaints.
router.post(
  '/',
  authorize(Role.CITIZEN),
  handleSingleImageUpload,
  validate(createToiletRequestSchema),
  toiletRequestController.create
);

// Owner (citizen) or admin — enforced inside toiletRequest.service.ts,
// since it depends on the specific request's userId, not just role.
router.get('/:id', toiletRequestController.getById);

// Admin-only: approve creates the official Toilet (reusing
// toilet.service.ts's createToilet — see toiletRequest.service.ts).
router.patch(
  '/:id/approve',
  authorize(Role.ADMIN),
  validate(reviewToiletRequestSchema),
  toiletRequestController.approve
);

// Admin-only: reject leaves the request rejected, no Toilet created.
router.patch(
  '/:id/reject',
  authorize(Role.ADMIN),
  validate(reviewToiletRequestSchema),
  toiletRequestController.reject
);

export default router;
