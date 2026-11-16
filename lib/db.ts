import { PrismaClient } from "@prisma/client";

/**
 * One PrismaClient for the process.
 *
 * Next.js hot-reloads modules in development, and a fresh client per reload
 * exhausts the database's connection limit within a few edits.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
