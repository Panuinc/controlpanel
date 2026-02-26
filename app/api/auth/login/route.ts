import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, signToken, signTempToken } from '@/lib/auth';
import { verifyTOTP } from '@/lib/totp-utils';
import { AUTH_COOKIE_NAME } from '@/lib/constants';
import { logAudit } from '@/lib/audit-utils';
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
  const { username, password, totpCode } = body;

  if (!username || !password) {
    return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
  }

  const user = await validateCredentials(username, password);
  if (!user) {
    const current = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    loginAttempts.set(ip, { count: current.count + 1, lastAttempt: Date.now() });
    await logAudit(req, 'login_failed', 'auth', username, 'Invalid credentials', 'failure');
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  }

  // Check 2FA
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!totpCode) {
      const tempToken = signTempToken(user.username, user.id);
      return NextResponse.json({ success: false, requires2FA: true, tempToken });
    }

    // Check recovery codes first
    const recoveryMatch = user.recoveryCodes.indexOf(totpCode);
    if (recoveryMatch >= 0) {
      const { updateUserField } = await import('@/lib/user-utils');
      const newCodes = [...user.recoveryCodes];
      newCodes.splice(recoveryMatch, 1);
      await updateUserField(user.id, 'recoveryCodes', newCodes);
    } else {
      const valid = verifyTOTP(user.twoFactorSecret, totpCode);
      if (!valid) {
        await logAudit(req, 'login_2fa_failed', 'auth', username, 'Invalid 2FA code', 'failure');
        return NextResponse.json({ success: false, error: 'Invalid 2FA code' }, { status: 401 });
      }
    }
  }

  loginAttempts.delete(ip);

  const token = signToken(user.username, user.id, user.role);
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  await logAudit(req, 'login_success', 'auth', username, `User logged in (role: ${user.role})`, 'success');

  return response;
}
