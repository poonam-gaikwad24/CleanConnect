import { z } from 'zod';

// POST /api/admin/staff (ADMIN only). Deliberately the same shape as
// registerSchema in auth.validators.ts — same name/email/password
// rules — but note there is no `role` field here either: it's not
// accepted from the client any more than public registration accepts
// one. The route itself (ADMIN-only, see staff.routes.ts) is what
// authorizes creating a STAFF account; staff.service.ts always sets
// role: Role.STAFF server-side.
export const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
