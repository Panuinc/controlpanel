import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createUser, toPublicUser, UserError } from '@/lib/user-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { username, password, role } = await req.json();
    const user = await createUser(username, password, role);
    await logAudit(req, 'user_created', 'user', username, `Created user with role: ${role}`, 'success');
    return NextResponse.json({ success: true, user: toPublicUser(user) });
  } catch (err) {
    if (err instanceof UserError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create user' }, { status: 500 });
  }
}
