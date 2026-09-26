import { Prisma, RequestStatus, Role, Toilet, ToiletRegistrationRequest } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { formatRequestCode } from '../utils/toiletRequestId';
import {
  CreateToiletRequestInput,
  ListToiletRequestsQuery,
} from '../validators/toiletRequest.validators';
import { uploadToiletRequestImage } from './imageStorage.service';
import * as toiletService from './toilet.service';

export type ToiletRequestWithToilet = ToiletRegistrationRequest & { resultingToilet: Toilet | null };

// Same count-based generation as getNextCleanConnectId()/
// getNextComplaintCode() — simple, deterministic, fine at this
// project's scale (see toilet.service.ts's comment for the full
// reasoning and the concurrency caveat).
async function getNextRequestCode(): Promise<string> {
  const count = await prisma.toiletRegistrationRequest.count();
  return formatRequestCode(count + 1);
}

export async function createRequest(
  userId: string,
  input: CreateToiletRequestInput,
  file?: Express.Multer.File
): Promise<ToiletRegistrationRequest> {
  // Optional evidence photo, same idea as complaint evidence: helps
  // the admin verify the toilet actually exists before approving.
  const imageUrl = file ? await uploadToiletRequestImage(file) : null;
  const requestCode = await getNextRequestCode();

  return prisma.toiletRegistrationRequest.create({
    data: {
      requestCode,
      userId,
      location: input.location,
      landmark: input.landmark ?? null,
      address: input.address ?? null,
      description: input.description ?? null,
      imageUrl,
      status: RequestStatus.PENDING,
    },
  });
}

export async function listMyRequests(userId: string): Promise<ToiletRequestWithToilet[]> {
  return prisma.toiletRegistrationRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { resultingToilet: true },
  });
}

export interface ToiletRequestRequester {
  id: string;
  role: Role;
}

// Same ownership rule as complaint.service.ts's getComplaintById: the
// citizen who filed it, or an admin — nobody else.
export async function getRequestById(
  id: string,
  requester: ToiletRequestRequester
): Promise<ToiletRequestWithToilet> {
  const request = await prisma.toiletRegistrationRequest.findUnique({
    where: { id },
    include: { resultingToilet: true },
  });

  if (!request) {
    throw new AppError('Registration request not found', 404);
  }

  const isOwner = request.userId === requester.id;
  const isAdmin = requester.role === Role.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError('You do not have access to this request', 403);
  }

  return request;
}

export interface PaginatedToiletRequests {
  data: ToiletRequestWithToilet[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Admin-only listing across all citizens' requests.
export async function listRequests(query: ListToiletRequestsQuery): Promise<PaginatedToiletRequests> {
  const where: Prisma.ToiletRegistrationRequestWhereInput = {};

  if (query.status !== undefined) {
    where.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    prisma.toiletRegistrationRequest.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: { resultingToilet: true },
    }),
    prisma.toiletRegistrationRequest.count({ where }),
  ]);

  return {
    data,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

async function getPendingRequestOrThrow(id: string): Promise<ToiletRegistrationRequest> {
  const request = await prisma.toiletRegistrationRequest.findUnique({ where: { id } });

  if (!request) {
    throw new AppError('Registration request not found', 404);
  }

  if (request.status !== RequestStatus.PENDING) {
    throw new AppError(`This request has already been ${request.status.toLowerCase()}`, 409);
  }

  return request;
}

// The important piece of Module 6's approval workflow: this calls the
// SAME toilet.service.ts#createToilet used by the admin "create
// toilet" endpoint (Module 3/6) — meaning the SAME
// getNextCleanConnectId() generator, the SAME externalId-optional
// handling, and the SAME validation. There is deliberately no second,
// request-specific toilet-creation code path anywhere in this
// codebase.
//
// externalId is never set here — a citizen-reported toilet has no PMC
// source record, and CleanConnect never invents one (see the Toilet
// model's schema comment).
export async function approveRequest(
  id: string,
  adminNotes?: string
): Promise<ToiletRequestWithToilet> {
  const request = await getPendingRequestOrThrow(id);

  const toilet = await toiletService.createToilet({
    location: request.location,
    landmark: request.landmark ?? undefined,
  });

  return prisma.toiletRegistrationRequest.update({
    where: { id },
    data: {
      status: RequestStatus.APPROVED,
      adminNotes: adminNotes ?? request.adminNotes,
      resultingToiletId: toilet.id,
    },
    include: { resultingToilet: true },
  });
}

export async function rejectRequest(
  id: string,
  adminNotes?: string
): Promise<ToiletRequestWithToilet> {
  const request = await getPendingRequestOrThrow(id);

  return prisma.toiletRegistrationRequest.update({
    where: { id },
    data: {
      status: RequestStatus.REJECTED,
      adminNotes: adminNotes ?? request.adminNotes,
    },
    include: { resultingToilet: true },
  });
}
