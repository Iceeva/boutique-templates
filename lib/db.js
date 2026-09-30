import { PrismaClient } from '@prisma/client';
export const prisma = (globalThis.__prisma ??= new PrismaClient());

export async function getSettings() {
  return prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
