import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { updateUser, toPublicUser, UserError } from '@/lib/user-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { id, username, password, role } = await req.json();
    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    const user = await updateUser(id, { username, password, role });
    await logAudit(req, 'user_updated', 'user', user.username, 'User updated', 'success');
    return NextResponse.json({ success: true, user: toPublicUser(user) });
  } catch (err) {
    if (err instanceof UserError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update user' }, { status: 500 });
  }
}
