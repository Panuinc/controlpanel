import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET, JWT_EXPIRY } from './constants';
import type { JWTPayload } from '@/types/auth';

const hashedPassword = bcryptjs.hashSync(ADMIN_PASSWORD, 10);

export function validateCredentials(username: string, password: string): boolean {
  if (username !== ADMIN_USERNAME) return false;
  return bcryptjs.compareSync(password, hashedPassword);
}

export function signToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}
