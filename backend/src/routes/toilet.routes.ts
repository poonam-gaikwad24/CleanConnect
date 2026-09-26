import { Router } from 'express';
import { Role } from '@prisma/client';
import * as toiletController from '../controllers/toilet.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate, validateQuery } from '../middleware/validate';
import {
  createToiletSchema,
  listToiletsQuerySchema,
  nearbyToiletsQuerySchema,
  updateToiletSchema,
} from '../validators/toilet.validators';

const router = Router();

// Public — no authentication required.
// /nearby is registered before /:id so "nearby" is never captured as an :id param.
router.get('/nearby', validateQuery(nearbyToiletsQuerySchema), toiletController.nearby);
router.get('/', validateQuery(listToiletsQuerySchema), toiletController.list);
router.get('/:id', toiletController.getById);

// Admin-only writes.
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validate(createToiletSchema),
  toiletController.create
);
router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validate(updateToiletSchema),
  toiletController.update
);
router.delete('/:id', authenticate, authorize(Role.ADMIN), toiletController.remove);

export default router;
