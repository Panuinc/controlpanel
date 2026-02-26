import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { deleteUser, UserError } from '@/lib/user-utils';
import { logAudit } from '@/lib/audit-utils';

export async function DELETE(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    await deleteUser(id);
    await logAudit(req, 'user_deleted', 'user', id, 'User deleted', 'success');
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UserError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete user' }, { status: 500 });
  }
}
