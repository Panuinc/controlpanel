import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createBackup, BackupError } from '@/lib/backup-utils';
import { getProject } from '@/lib/project-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const project = await getProject(projectId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const backup = await createBackup(projectId, project.name, project.path, project.currentCommit);
    await logAudit(req, 'backup_created', 'backup', project.name, `Backup created: ${backup.filename}`, 'success');
    return NextResponse.json({ success: true, backup });
  } catch (err) {
    if (err instanceof BackupError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create backup' }, { status: 500 });
  }
}
