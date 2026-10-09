import { Router } from 'express';
import { Role } from '@prisma/client';
import * as staffController from '../controllers/staff.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createStaffSchema } from '../validators/staff.validators';

const router = Router();

// Every route here is ADMIN-only — there is no STAFF self-service and
// no public access at all, unlike /api/auth/register.
router.use(authenticate, authorize(Role.ADMIN));

router.post('/', validate(createStaffSchema), staffController.create);
router.get('/', staffController.list);

export default router;
