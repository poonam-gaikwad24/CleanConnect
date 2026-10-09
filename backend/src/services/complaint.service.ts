import { Complaint, ComplaintStatus, MaintenanceTask, Prisma, Role, Toilet, User } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { formatComplaintCode } from '../utils/complaintId';
import { CreateComplaintInput, ListComplaintsQuery } from '../validators/complaint.validators';
import { uploadComplaintImage } from './imageStorage.service';

// Module 7 addition: complaint responses now also carry
// `maintenanceTask` (null if none has been assigned yet), with its
// assignedStaff reduced to public fields only (never passwordHash).
// This is purely additive — every field that existed before Module 7
// is unchanged, so this does not affect Module 5 behavior at all; it
// just means the existing Admin Complaint Details page can tell
// whether to show "Assign Maintenance Task" or the task's current
// status without a second API call.
type AssignedStaffPublic = Pick<User, 'id' | 'name' | 'email' | 'role'>;
type MaintenanceTaskSummary = MaintenanceTask & { assignedStaff: AssignedStaffPublic };

const COMPLAINT_INCLUDE = {
  toilet: true,
  maintenanceTask: {
    include: { assignedStaff: { select: { id: true, name: true, email: true, role: true } } },
  },
} as const;

export type ComplaintWithToilet = Complaint & {
  toilet: Toilet;
  maintenanceTask: MaintenanceTaskSummary | null;
};

// Same count-based generation as getNextCleanConnectId() in
// toilet.service.ts, for the same reasons (see that function's
// comment): simple, deterministic, fine at this project's scale.
async function getNextComplaintCode(): Promise<string> {
  const count = await prisma.complaint.count();
  return formatComplaintCode(count + 1);
}

export async function createComplaint(
  userId: string,
  input: CreateComplaintInput,
  file?: Express.Multer.File
): Promise<ComplaintWithToilet> {
  // Accepts either the toilet's own id or its cleanConnectId — same
  // lookup as toilet.service.ts's getToiletById — but only the
  // resolved toilet.id is ever stored as the foreign key. This is
  // what "Complaint.toiletId → Toilet.id, never cleanConnectId" means
  // in practice: whatever identifier the client sent, the row it
  // points at is what gets linked.
  const toilet = await prisma.toilet.findFirst({
    where: { OR: [{ id: input.toiletId }, { cleanConnectId: input.toiletId }] },
  });

  if (!toilet) {
    throw new AppError('Selected toilet was not found', 404);
  }

  // Image upload is genuinely optional and, if it fails, should not
  // take down complaint submission either — but an upload failure
  // here is unexpected (unlike a slow/absent external service) so
  // it's surfaced as an error rather than silently dropping the photo.
  const imageUrl = file ? await uploadComplaintImage(file) : null;

  const complaintCode = await getNextComplaintCode();

  return prisma.complaint.create({
    data: {
      complaintCode,
      toiletId: toilet.id,
      userId,
      description: input.description,
      category: input.category,
      imageUrl,
      status: ComplaintStatus.PENDING,
    },
    include: COMPLAINT_INCLUDE,
  });
}

export async function listMyComplaints(userId: string): Promise<ComplaintWithToilet[]> {
  return prisma.complaint.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: COMPLAINT_INCLUDE,
  });
}

export interface ComplaintRequester {
  id: string;
  role: Role;
}

// A complaint is visible to the citizen who filed it, or to an admin
// — never to any other citizen, and never directly to STAFF through
// this endpoint. A staff member assigned to a complaint's maintenance
// task instead gets everything they need (description, category,
// citizen evidence image, toilet) embedded in the task response from
// GET /api/maintenance-tasks/:id — see maintenanceTask.service.ts —
// so this function's access rule is unchanged from Module 5.
export async function getComplaintById(
  id: string,
  requester: ComplaintRequester
): Promise<ComplaintWithToilet> {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: COMPLAINT_INCLUDE,
  });

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  const isOwner = complaint.userId === requester.id;
  const isAdmin = requester.role === Role.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError('You do not have access to this complaint', 403);
  }

  return complaint;
}

export interface PaginatedComplaints {
  data: ComplaintWithToilet[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Admin-only listing across all citizens' complaints.
export async function listComplaints(query: ListComplaintsQuery): Promise<PaginatedComplaints> {
  const where: Prisma.ComplaintWhereInput = {};

  if (query.status !== undefined) {
    where.status = query.status;
  }

  if (query.category !== undefined) {
    where.category = query.category;
  }

  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: COMPLAINT_INCLUDE,
    }),
    prisma.complaint.count({ where }),
  ]);

  return {
    data,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus
): Promise<ComplaintWithToilet> {
  const existing = await prisma.complaint.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError('Complaint not found', 404);
  }

  return prisma.complaint.update({
    where: { id },
    data: { status },
    include: COMPLAINT_INCLUDE,
  });
}
