import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { containerAction, DockerError } from '@/lib/docker-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const { id, action } = await req.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'Container ID and action are required' }, { status: 400 });
    }
    const result = await containerAction(id, action);
    await logAudit(req, `docker_${action}`, 'docker', id, `Container ${action}: ${id}`, 'success');
    return NextResponse.json({ success: true, output: result });
  } catch (err) {
    if (err instanceof DockerError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to perform action' }, { status: 500 });
  }
}
