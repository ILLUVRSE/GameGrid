import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export type SessionPayload = {
  userId: string;
  email: string;
  role: Role;
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
