import { NextRequest, NextResponse } from 'next/server';
import { loadProjects } from '@/lib/project-utils';
import type { ProjectStatus } from '@/types/projects';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const filter = req.nextUrl.searchParams.get('filter') as ProjectStatus | 'all' | null;
    let projects = await loadProjects();

    if (filter && filter !== 'all') {
      projects = projects.filter((p) => p.status === filter);
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}
