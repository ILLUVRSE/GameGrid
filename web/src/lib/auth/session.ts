import { NextRequest } from 'next/server';
import { verifySessionToken } from './jwt';

export function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get('illuvrse_auth')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
