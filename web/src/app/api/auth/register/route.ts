import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/password';
import { createUser, getUserByEmail } from '@/lib/db/user';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof name !== 'string'
    ) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await createUser({ email, name, passwordHash: hashedPassword });

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[REGISTER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
