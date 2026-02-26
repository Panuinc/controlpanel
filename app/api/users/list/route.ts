import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { loadUsers, toPublicUser } from '@/lib/user-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const users = await loadUsers();
    return NextResponse.json({ users: users.map(toPublicUser) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list users' }, { status: err instanceof Error && err.message === 'Insufficient permissions' ? 403 : 500 });
  }
}
