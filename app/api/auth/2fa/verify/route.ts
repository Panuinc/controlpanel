import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { verifyTOTP } from '@/lib/totp-utils';
import { getUserById, updateUserField } from '@/lib/user-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });

    const user = await getUserById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!user.twoFactorSecret) return NextResponse.json({ error: 'Please setup 2FA first' }, { status: 400 });

    const valid = verifyTOTP(user.twoFactorSecret, code);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    await updateUserField(user.id, 'twoFactorEnabled', true);
    await logAudit(req, '2fa_enabled', 'auth', user.username, '2FA enabled', 'success');

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to verify 2FA' }, { status: 500 });
  }
}
