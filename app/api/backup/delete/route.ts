import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { deleteBackup, BackupError } from '@/lib/backup-utils';
import { logAudit } from '@/lib/audit-utils';

export async function DELETE(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 });
    await deleteBackup(id);
    await logAudit(req, 'backup_deleted', 'backup', id, 'Backup deleted', 'success');
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof BackupError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete backup' }, { status: 500 });
  }
}
