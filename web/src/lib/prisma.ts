import { PrismaClient } from '@prisma/client';

export const hasDatabase = Boolean(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = hasDatabase
  ? globalForPrisma.prisma ??
    new PrismaClient({
      log: ['error'],
    })
  : (null as unknown as PrismaClient);

if (hasDatabase && process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
