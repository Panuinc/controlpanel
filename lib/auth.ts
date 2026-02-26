import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRY } from './constants';
import { authenticateUser, ensureDefaultAdmin } from './user-utils';
import type { JWTPayload } from '@/types/auth';
import type { UserRole } from '@/types/users';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function validateCredentials(username: string, password: string) {
  await ensureDefaultAdmin();
  return authenticateUser(username, password);
}

export function signToken(username: string, userId: string, role: UserRole): string {
  return jwt.sign({ sub: username, username, userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function signTempToken(username: string, userId: string): string {
  return jwt.sign({ sub: username, username, userId, purpose: '2fa' }, JWT_SECRET, { expiresIn: '5m' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyTempToken(token: string): { username: string; userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { username: string; userId: string; purpose: string };
    if (payload.purpose !== '2fa') return null;
    return { username: payload.username, userId: payload.userId };
  } catch {
    return null;
  }
}

export async function getRequestUser(req: NextRequest): Promise<JWTPayload | null> {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return null;
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return {
      username: (payload.sub as string) || (payload.username as string) || '',
      userId: (payload.userId as string) || '',
      role: (payload.role as UserRole) || 'viewer',
      iat: payload.iat || 0,
      exp: payload.exp || 0,
    };
  } catch {
    return null;
  }
}

export async function requireRole(req: NextRequest, allowedRoles: UserRole[]): Promise<JWTPayload> {
  const user = await getRequestUser(req);
  if (!user) throw new Error('Unauthorized');
  if (!allowedRoles.includes(user.role)) throw new Error('Insufficient permissions');
  return user;
}
