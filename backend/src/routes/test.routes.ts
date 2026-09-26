// TEMPORARY: RBAC verification endpoints only.
// Delete this file (and its mount in app.ts) once role-based
// authorization has been manually verified for Module 2.

import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/citizen-only', authenticate, authorize(Role.CITIZEN), (_req, res) => {
  res.status(200).json({ message: 'Hello CITIZEN, access granted' });
});

router.get('/staff-only', authenticate, authorize(Role.STAFF), (_req, res) => {
  res.status(200).json({ message: 'Hello STAFF, access granted' });
});

router.get('/admin-only', authenticate, authorize(Role.ADMIN), (_req, res) => {
  res.status(200).json({ message: 'Hello ADMIN, access granted' });
});

export default router;
