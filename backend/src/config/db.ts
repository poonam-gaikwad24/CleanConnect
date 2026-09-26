import { PrismaClient } from '@prisma/client';

// Single shared Prisma Client instance for the whole application.
// Every service that needs database access should import `prisma`
// from here rather than creating a new PrismaClient().
export const prisma = new PrismaClient();
