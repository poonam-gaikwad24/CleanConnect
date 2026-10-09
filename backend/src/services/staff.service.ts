import { Role } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { hashPassword, PublicUser, toPublicUser } from './auth.service';
import { CreateStaffInput } from '../validators/staff.validators';

// The ONLY place in the codebase that creates a Role.STAFF user.
// Public registration (auth.service.ts#register) always hard-codes
// Role.CITIZEN and never reads a role from the request — this
// function is reachable only through POST /api/admin/staff, which is
// authenticate + authorize(ADMIN)-gated in staff.routes.ts. The
// combination of "never accept role from the client" (true here too —
// CreateStaffInput has no role field) and "ADMIN-only route" is what
// actually enforces the Module 7 security rule; this function itself
// doesn't re-check the caller's role, since that's the route's job.
export async function createStaffAccount(input: CreateStaffInput): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: Role.STAFF,
    },
  });

  return toPublicUser(user);
}

export async function listStaff(): Promise<PublicUser[]> {
  const users = await prisma.user.findMany({
    where: { role: Role.STAFF },
    orderBy: { createdAt: 'desc' },
  });

  return users.map(toPublicUser);
}
