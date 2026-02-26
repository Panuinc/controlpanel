import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getContainerLogs, DockerError } from '@/lib/docker-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const id = req.nextUrl.searchParams.get('id');
    const tail = parseInt(req.nextUrl.searchParams.get('tail') || '200');
    if (!id) return NextResponse.json({ error: 'Container ID is required' }, { status: 400 });
    const logs = await getContainerLogs(id, tail);
    return NextResponse.json({ logs });
  } catch (err) {
    if (err instanceof DockerError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to get logs' }, { status: 500 });
  }
}
