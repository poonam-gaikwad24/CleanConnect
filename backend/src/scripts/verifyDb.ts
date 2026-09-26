// NOTE: This script requires a generated PrismaClient, which in turn
// requires at least one model in schema.prisma. It will not run until
// a later module adds the first real model. For Module 1, use
// `npm run db:verify` instead (CLI-based, no models required).
import { prisma } from '../config/db';

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Prisma successfully connected to PostgreSQL');
  } catch (error) {
    console.error('❌ Prisma failed to connect to PostgreSQL');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
