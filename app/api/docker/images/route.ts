import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { listImages, pullImage, DockerError } from '@/lib/docker-utils';
import { logAudit } from '@/lib/audit-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const images = await listImages();
    return NextResponse.json({ images });
  } catch (err) {
    if (err instanceof DockerError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list images' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Image name is required' }, { status: 400 });
    const output = await pullImage(name);
    await logAudit(req, 'docker_pull', 'docker', name, `Pulled image: ${name}`, 'success');
    return NextResponse.json({ success: true, output });
  } catch (err) {
    if (err instanceof DockerError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to pull image' }, { status: 500 });
  }
}
