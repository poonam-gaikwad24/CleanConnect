import { Router } from 'express';
import { Role } from '@prisma/client';
import * as maintenanceTaskController from '../controllers/maintenanceTask.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { handleSingleImageUpload } from '../middleware/upload';
import {
  assignTaskSchema,
  revisionTaskSchema,
  submitTaskSchema,
  verifyTaskSchema,
} from '../validators/maintenanceTask.validators';

const router = Router();

// Every route here requires a signed-in user — same as complaints and
// toilet-requests, there is no public maintenance-task data.
router.use(authenticate);

// /my before /:id so "my" is never captured as an :id param — same
// pattern used throughout the project.
router.get('/my', authorize(Role.STAFF), maintenanceTaskController.my);

// ADMIN-only: assign a new task to a complaint.
router.post('/', authorize(Role.ADMIN), validate(assignTaskSchema), maintenanceTaskController.assign);

// ADMIN or the specific assigned STAFF member — ownership for STAFF is
// enforced inside maintenanceTask.service.ts, since it depends on the
// task's assignedStaffId, not just role.
router.get('/:id', authorize(Role.ADMIN, Role.STAFF), maintenanceTaskController.getById);

// Assigned-STAFF-only.
router.patch('/:id/start', authorize(Role.STAFF), maintenanceTaskController.start);

// Assigned-STAFF-only, multipart with required proof photo.
// handleSingleImageUpload (multer) must run before validate() so the
// multipart body's text fields have already been parsed into req.body
// by the time Zod sees them — same ordering as POST /api/complaints.
router.patch(
  '/:id/submit',
  authorize(Role.STAFF),
  handleSingleImageUpload,
  validate(submitTaskSchema),
  maintenanceTaskController.submit
);

// ADMIN-only: accept the work, resolving the complaint.
router.patch(
  '/:id/verify',
  authorize(Role.ADMIN),
  validate(verifyTaskSchema),
  maintenanceTaskController.verify
);

// ADMIN-only: reject the work, requiring a reason.
router.patch(
  '/:id/revision',
  authorize(Role.ADMIN),
  validate(revisionTaskSchema),
  maintenanceTaskController.revision
);

export default router;
