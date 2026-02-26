import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { restoreBackup, BackupError, listBackups } from '@/lib/backup-utils';
import { getProject } from '@/lib/project-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { backupId } = await req.json();
    if (!backupId) return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 });

    const allBackups = await listBackups();
    const backup = allBackups.find((b) => b.id === backupId);
    if (!backup) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });

    const project = await getProject(backup.projectId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    await restoreBackup(backupId, project.path);
    await logAudit(req, 'backup_restored', 'backup', project.name, `Restored from: ${backup.filename}`, 'success');
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof BackupError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to restore backup' }, { status: 500 });
  }
}
