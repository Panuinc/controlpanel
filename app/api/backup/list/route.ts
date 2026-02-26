import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { listBackups } from '@/lib/backup-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const projectId = req.nextUrl.searchParams.get('projectId') || undefined;
    const backups = await listBackups(projectId);
    return NextResponse.json({ backups });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list backups' }, { status: 500 });
  }
}
