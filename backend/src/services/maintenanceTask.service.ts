import {
  Complaint,
  ComplaintStatus,
  MaintenanceTask,
  Role,
  TaskStatus,
  Toilet,
  User,
} from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { formatTaskCode } from '../utils/taskId';
import {
  AssignTaskInput,
  RevisionTaskInput,
  SubmitTaskInput,
  VerifyTaskInput,
} from '../validators/maintenanceTask.validators';
import { uploadMaintenanceProofImage } from './imageStorage.service';

type StaffPublic = Pick<User, 'id' | 'name' | 'email' | 'role'>;

const STAFF_SELECT = { id: true, name: true, email: true, role: true } as const;

const TASK_INCLUDE = {
  complaint: { include: { toilet: true } },
  assignedStaff: { select: STAFF_SELECT },
} as const;

export type TaskWithRelations = MaintenanceTask & {
  complaint: Complaint & { toilet: Toilet };
  assignedStaff: StaffPublic;
};

// Same count-based generation as getNextCleanConnectId() /
// getNextComplaintCode() / getNextRequestCode() — simple,
// deterministic, fine at this project's scale (see toilet.service.ts's
// comment for the full reasoning and the concurrency caveat).
async function getNextTaskCode(): Promise<string> {
  const count = await prisma.maintenanceTask.count();
  return formatTaskCode(count + 1);
}

export async function assignTask(input: AssignTaskInput): Promise<TaskWithRelations> {
  const complaint = await prisma.complaint.findUnique({ where: { id: input.complaintId } });

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  // One task per complaint — enforced here with a clear error message
  // (and backed by complaintId's @unique constraint in schema.prisma
  // as a hard guarantee). A revision cycle never reaches this
  // function again; it goes through startTask/submitTask instead.
  const existingTask = await prisma.maintenanceTask.findUnique({
    where: { complaintId: complaint.id },
  });

  if (existingTask) {
    throw new AppError('This complaint already has a maintenance task', 409);
  }

  const staff = await prisma.user.findUnique({ where: { id: input.assignedStaffId } });

  if (!staff || staff.role !== Role.STAFF) {
    throw new AppError('assignedStaffId must reference an existing STAFF user', 400);
  }

  const taskCode = await getNextTaskCode();

  // Both writes in one transaction: a task is never created without
  // the complaint reflecting that it's now being worked on, and vice
  // versa. PENDING -> IN_PROGRESS is the only transition made here;
  // this function can only ever run once per complaint (see the
  // duplicate check above), so there's no later status to accidentally
  // regress.
  const [task] = await prisma.$transaction([
    prisma.maintenanceTask.create({
      data: {
        taskCode,
        complaintId: complaint.id,
        assignedStaffId: staff.id,
        taskInstruction: input.taskInstruction,
        status: TaskStatus.ASSIGNED,
      },
      include: TASK_INCLUDE,
    }),
    prisma.complaint.update({
      where: { id: complaint.id },
      data: { status: ComplaintStatus.IN_PROGRESS },
    }),
  ]);

  return task as TaskWithRelations;
}

export interface TaskRequester {
  id: string;
  role: Role;
}

// A task is visible to an admin, or to the specific staff member it's
// assigned to — never to any other staff member. This is enforced
// here (not just hidden in the UI), per Module 7's explicit security
// requirement.
function assertCanAccessTask(task: MaintenanceTask, requester: TaskRequester): void {
  const isAdmin = requester.role === Role.ADMIN;
  const isAssignedStaff = requester.role === Role.STAFF && task.assignedStaffId === requester.id;

  if (!isAdmin && !isAssignedStaff) {
    throw new AppError('You do not have access to this maintenance task', 403);
  }
}

export async function getTaskById(id: string, requester: TaskRequester): Promise<TaskWithRelations> {
  const task = await prisma.maintenanceTask.findUnique({ where: { id }, include: TASK_INCLUDE });

  if (!task) {
    throw new AppError('Maintenance task not found', 404);
  }

  assertCanAccessTask(task, requester);

  return task as TaskWithRelations;
}

// STAFF-only: a staff member's own tasks, nothing else — scoped by
// assignedStaffId in the query itself (not filtered after the fact),
// so there's no code path that could accidentally return another
// staff member's tasks.
export async function listMyTasks(staffId: string): Promise<TaskWithRelations[]> {
  const tasks = await prisma.maintenanceTask.findMany({
    where: { assignedStaffId: staffId },
    orderBy: { createdAt: 'desc' },
    include: TASK_INCLUDE,
  });

  return tasks as TaskWithRelations[];
}

async function getTaskOrThrow(id: string): Promise<MaintenanceTask> {
  const task = await prisma.maintenanceTask.findUnique({ where: { id } });

  if (!task) {
    throw new AppError('Maintenance task not found', 404);
  }

  return task;
}

function assertAssignedStaff(task: MaintenanceTask, staffId: string): void {
  if (task.assignedStaffId !== staffId) {
    throw new AppError('You are not assigned to this task', 403);
  }
}

// ASSIGNED -> IN_PROGRESS, or REVISION_REQUIRED -> IN_PROGRESS (the
// second leg of a revision cycle, per Module 7's status diagram).
export async function startTask(id: string, staffId: string): Promise<TaskWithRelations> {
  const task = await getTaskOrThrow(id);
  assertAssignedStaff(task, staffId);

  if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.REVISION_REQUIRED) {
    throw new AppError(`Cannot start a task that is ${task.status}`, 409);
  }

  const updated = await prisma.maintenanceTask.update({
    where: { id },
    data: { status: TaskStatus.IN_PROGRESS },
    include: TASK_INCLUDE,
  });

  return updated as TaskWithRelations;
}

// IN_PROGRESS -> SUBMITTED only. A proof photo is required every time
// (including resubmission after a revision) — it's the whole point of
// this step, so there's no "submit without new proof" path.
export async function submitTask(
  id: string,
  staffId: string,
  input: SubmitTaskInput,
  file: Express.Multer.File | undefined
): Promise<TaskWithRelations> {
  const task = await getTaskOrThrow(id);
  assertAssignedStaff(task, staffId);

  if (task.status !== TaskStatus.IN_PROGRESS) {
    throw new AppError(`Cannot submit a task that is ${task.status} — start it first`, 409);
  }

  if (!file) {
    throw new AppError('A proof-of-work photo is required to submit', 400);
  }

  const proofImageUrl = await uploadMaintenanceProofImage(file);

  const updated = await prisma.maintenanceTask.update({
    where: { id },
    data: {
      status: TaskStatus.SUBMITTED,
      proofImageUrl,
      staffComment: input.staffComment ?? null,
      completedAt: new Date(),
    },
    include: TASK_INCLUDE,
  });

  return updated as TaskWithRelations;
}

// SUBMITTED -> VERIFIED, and Complaint -> RESOLVED, in one
// transaction. This is the only place in the codebase that sets a
// Complaint to RESOLVED via the task workflow — the existing
// PATCH /api/complaints/:id/status (Module 5) still exists unchanged
// for direct admin status edits, but the "real" resolution path for a
// complaint that went through task assignment is this one.
export async function verifyTask(id: string, input: VerifyTaskInput): Promise<TaskWithRelations> {
  const task = await getTaskOrThrow(id);

  if (task.status !== TaskStatus.SUBMITTED) {
    throw new AppError(
      `Cannot verify a task that is ${task.status} — it must be submitted first`,
      409
    );
  }

  const [updatedTask] = await prisma.$transaction([
    prisma.maintenanceTask.update({
      where: { id },
      data: {
        status: TaskStatus.VERIFIED,
        verifiedAt: new Date(),
        adminComment: input.adminComment ?? null,
      },
      include: TASK_INCLUDE,
    }),
    prisma.complaint.update({
      where: { id: task.complaintId },
      data: { status: ComplaintStatus.RESOLVED },
    }),
  ]);

  return updatedTask as TaskWithRelations;
}

// SUBMITTED -> REVISION_REQUIRED. Complaint.status is deliberately
// left untouched — it stays IN_PROGRESS (set back at assignment time),
// never RESOLVED, exactly as Module 7 requires. Staff sees adminComment
// as the reason, then goes through startTask -> submitTask again.
export async function requestRevision(
  id: string,
  input: RevisionTaskInput
): Promise<TaskWithRelations> {
  const task = await getTaskOrThrow(id);

  if (task.status !== TaskStatus.SUBMITTED) {
    throw new AppError(
      `Cannot request revision on a task that is ${task.status} — it must be submitted first`,
      409
    );
  }

  const updated = await prisma.maintenanceTask.update({
    where: { id },
    data: {
      status: TaskStatus.REVISION_REQUIRED,
      adminComment: input.adminComment,
    },
    include: TASK_INCLUDE,
  });

  return updated as TaskWithRelations;
}
