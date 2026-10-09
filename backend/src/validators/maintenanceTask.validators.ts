import { z } from 'zod';

// POST /api/maintenance-tasks (ADMIN). complaintId/assignedStaffId are
// the actual Prisma ids — maintenanceTask.service.ts#assignTask
// resolves and validates both (complaint exists + has no task yet,
// assignedStaffId belongs to an actual Role.STAFF user) rather than
// trusting them blindly.
export const assignTaskSchema = z.object({
  complaintId: z.string().min(1, 'complaintId is required'),
  assignedStaffId: z.string().min(1, 'Please select a staff member'),
  taskInstruction: z
    .string()
    .trim()
    .min(5, 'Please describe what needs to be done')
    .max(1000, 'Instruction is too long (max 1000 characters)'),
});

export type AssignTaskInput = z.infer<typeof assignTaskSchema>;

// PATCH /api/maintenance-tasks/:id/submit (assigned STAFF). Submitted
// as multipart/form-data to carry the required proof photo — see
// middleware/upload.ts, reused unchanged from Module 5/6. staffComment
// is optional free text.
export const submitTaskSchema = z.object({
  staffComment: z.string().trim().max(1000, 'Comment is too long (max 1000 characters)').optional(),
});

export type SubmitTaskInput = z.infer<typeof submitTaskSchema>;

// PATCH /api/maintenance-tasks/:id/verify (ADMIN). adminComment is
// optional here — an admin accepting the work doesn't have to explain
// why, only rejecting it does (see revisionTaskSchema below).
export const verifyTaskSchema = z.object({
  adminComment: z.string().trim().max(1000, 'Comment is too long (max 1000 characters)').optional(),
});

export type VerifyTaskInput = z.infer<typeof verifyTaskSchema>;

// PATCH /api/maintenance-tasks/:id/revision (ADMIN). adminComment is
// REQUIRED here — staff needs an actual reason to act on, per Module
// 7's spec ("Admin must provide a reason/comment").
export const revisionTaskSchema = z.object({
  adminComment: z
    .string()
    .trim()
    .min(5, 'Please explain what needs further action')
    .max(1000, 'Comment is too long (max 1000 characters)'),
});

export type RevisionTaskInput = z.infer<typeof revisionTaskSchema>;
