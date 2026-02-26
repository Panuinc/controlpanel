import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { getUserById, updateUserField } from '@/lib/user-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: 'Password is required to disable 2FA' }, { status: 400 });

    const user = await getUserById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const bcryptjs = await import('bcryptjs');
    if (!bcryptjs.compareSync(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    await updateUserField(user.id, 'twoFactorEnabled', false);
    await updateUserField(user.id, 'twoFactorSecret', null);
    await updateUserField(user.id, 'recoveryCodes', []);
    await logAudit(req, '2fa_disabled', 'auth', user.username, '2FA disabled', 'success');

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to disable 2FA' }, { status: 500 });
  }
}
