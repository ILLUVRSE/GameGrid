import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function listUsers(skip = 0, take = 20) {
  return prisma.user.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export async function countUsers() {
  return prisma.user.count();
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  name?: string;
  role?: Role;
}) {
  return prisma.user.create({
    data: {
      email: params.email.toLowerCase(),
      passwordHash: params.passwordHash,
      name: params.name,
      role: params.role ?? Role.USER,
    },
  });
}

export async function updateUser(
  id: string,
  updates: Partial<{
    email: string;
    passwordHash: string;
    name: string | null;
    role: Role;
  }>
) {
  const data = { ...updates } as Record<string, unknown>;
  if (typeof updates.email === 'string') {
    data.email = updates.email.toLowerCase();
  }
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function deleteUsers(ids: string[]) {
  return prisma.user.deleteMany({ where: { id: { in: ids } } });
}
