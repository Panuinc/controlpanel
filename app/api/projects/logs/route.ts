import { NextRequest, NextResponse } from 'next/server';
import { getProject, getBuildLogs } from '@/lib/project-utils';

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

    const logs = await getBuildLogs(id);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to get project logs:', error);
    return NextResponse.json({ error: 'Failed to get logs' }, { status: 500 });
  }
}
