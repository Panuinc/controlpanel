import { NextRequest, NextResponse } from 'next/server';
import { getProject, pm2Status } from '@/lib/project-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const pm2 = await pm2Status(project.pm2Name);
    return NextResponse.json({
      project: {
        id: project.id,
        status: project.status,
        currentCommit: project.currentCommit,
        lastDeployedAt: project.lastDeployedAt,
        errorMessage: project.errorMessage,
      },
      pm2: pm2 || { status: 'not running', cpu: 0, memory: 0 },
    });
  } catch (error) {
    console.error('Failed to get project status:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
