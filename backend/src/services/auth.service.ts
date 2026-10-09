import bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../validators/auth.validators';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

// Strips passwordHash (and anything else internal) before a user is
// ever returned from the API. Exported so Module 7's staff.service.ts
// (admin-created STAFF accounts) can reuse it too — there is only one
// definition of "what a user looks like over the API" in this
// codebase.
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// Exported for the same reason as toPublicUser above — staff.service.ts
// reuses this exact hashing (same bcrypt call, same configured salt
// rounds) rather than duplicating it, so there is only one password
// hashing code path in the whole app, regardless of which flow created
// the account.
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
}

export async function register(
  input: RegisterInput
): Promise<{ user: PublicUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await hashPassword(input.password);

  // role is never taken from input — public registration is always CITIZEN.
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: Role.CITIZEN,
    },
  });

  const token = signToken({ sub: user.id, role: user.role });

  return { user: toPublicUser(user), token };
}

export async function login(
  input: LoginInput
): Promise<{ user: PublicUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same generic error whether the email doesn't exist or the
  // password is wrong — avoids confirming which emails are registered.
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken({ sub: user.id, role: user.role });

  return { user: toPublicUser(user), token };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found', 401);
  }

  return toPublicUser(user);
}
