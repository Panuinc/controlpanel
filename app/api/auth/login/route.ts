import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, signToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME } from '@/lib/constants';
import type { LoginRequest } from '@/types/auth';

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  const attempt = loginAttempts.get(ip);
  if (attempt && attempt.count >= MAX_ATTEMPTS && Date.now() - attempt.lastAttempt < WINDOW_MS) {
    return NextResponse.json({ success: false, error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const body = (await req.json()) as LoginRequest;
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
  }

  if (!validateCredentials(username, password)) {
    const current = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    loginAttempts.set(ip, { count: current.count + 1, lastAttempt: Date.now() });
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  }

  loginAttempts.delete(ip);

  const token = signToken(username);
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return response;
}
