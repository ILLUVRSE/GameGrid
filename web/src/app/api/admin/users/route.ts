import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import {
  countUsers,
  createUser,
  deleteUsers,
  getUserByEmail,
  listUsers,
  updateUser,
} from '@/lib/db/user';
import { Role } from '@prisma/client';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


function sanitizeUser<T extends { passwordHash?: string }>(user: T) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function isAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (session?.role === Role.ADMIN) {
    return true;
  }
  return false;
}

// GET: List users (admin only)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page') || '1');
  const pageSize = Number(url.searchParams.get('pageSize') || '20');
  const start = (page - 1) * pageSize;
  const [users, total] = await Promise.all([
    listUsers(start, pageSize),
    countUsers(),
  ]);

  return NextResponse.json({ users: users.map(sanitizeUser), total, page, pageSize });
}

// POST: Create a new user
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, password, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const safeRole = role === Role.ADMIN || role === Role.EDITOR ? role : Role.USER;
  const user = await createUser({ name, email, passwordHash, role: safeRole });

  return NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
}

// PATCH: Update user (accepts { id, ...fields })
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
  }

  if (fields.password) {
    fields.passwordHash = await hashPassword(fields.password);
    delete fields.password;
  }

  if (fields.email) {
    const duplicate = await getUserByEmail(fields.email);
    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: 'Email already in use by another user.' }, { status: 409 });
    }
  }

  if (
    fields.role &&
    fields.role !== Role.ADMIN &&
    fields.role !== Role.EDITOR &&
    fields.role !== Role.USER
  ) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  try {
    const updated = await updateUser(id, fields);
    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }
}

// DELETE: Delete one or more users (accepts { ids: string[] })
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const ids = body.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No user IDs provided.' }, { status: 400 });
  }

  const deleted = await deleteUsers(ids);
  return NextResponse.json({ count: deleted.count });
}
