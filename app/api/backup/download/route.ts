import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { listBackups, getBackupFilePath } from '@/lib/backup-utils';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 });

    const allBackups = await listBackups();
    const backup = allBackups.find((b) => b.id === id);
    if (!backup) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });

    const filePath = getBackupFilePath(backup);
    const data = await fs.readFile(filePath);

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${backup.filename}"`,
        'Content-Length': String(data.length),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to download backup' }, { status: 500 });
  }
}
