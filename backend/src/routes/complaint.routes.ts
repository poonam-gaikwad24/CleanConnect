import { Router } from 'express';
import { Role } from '@prisma/client';
import * as complaintController from '../controllers/complaint.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate, validateQuery } from '../middleware/validate';
import { handleSingleImageUpload } from '../middleware/upload';
import {
  createComplaintSchema,
  listComplaintsQuerySchema,
  updateComplaintStatusSchema,
} from '../validators/complaint.validators';

const router = Router();

// Unlike GET /api/toilets, there is no public complaint data at all —
// every route here requires a signed-in user.
router.use(authenticate);

// /my is registered before /:id so "my" is never captured as an :id
// param — same pattern as /nearby in toilet.routes.ts.
router.get('/my', complaintController.my);

// Admin-only: view every citizen's complaints.
router.get('/', authorize(Role.ADMIN), validateQuery(listComplaintsQuerySchema), complaintController.list);

// Citizen-only: file a new complaint. multer (handleSingleImageUpload)
// must run before validate() so the multipart body's text fields have
// already been parsed into req.body by the time Zod sees them.
router.post(
  '/',
  authorize(Role.CITIZEN),
  handleSingleImageUpload,
  validate(createComplaintSchema),
  complaintController.create
);

// Owner (citizen) or admin — enforced inside complaint.service.ts,
// since it depends on the specific complaint's userId, not just role.
router.get('/:id', complaintController.getById);

// Admin-only: move a complaint through PENDING -> IN_PROGRESS -> RESOLVED.
router.patch(
  '/:id/status',
  authorize(Role.ADMIN),
  validate(updateComplaintStatusSchema),
  complaintController.updateStatus
);

export default router;
