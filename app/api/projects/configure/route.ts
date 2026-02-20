import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject, validatePort, ProjectError } from '@/lib/project-utils';
import type { ProjectConfigureRequest } from '@/types/projects';

export async function POST(req: NextRequest) {
  try {
    const body: ProjectConfigureRequest = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const project = await getProject(body.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (body.port !== undefined) {
      validatePort(body.port);
    }

    const updates: Record<string, unknown> = {};
    if (body.domain !== undefined) updates.domain = body.domain;
    if (body.port !== undefined) updates.port = body.port;
    if (body.framework !== undefined) updates.framework = body.framework;
    if (body.installCommand !== undefined) updates.installCommand = body.installCommand;
    if (body.buildCommand !== undefined) updates.buildCommand = body.buildCommand;
    if (body.startCommand !== undefined) updates.startCommand = body.startCommand;
    if (body.envVars !== undefined) updates.envVars = body.envVars;
    if (body.sslEnabled !== undefined) updates.sslEnabled = body.sslEnabled;

    const updated = await updateProject(body.id, updates);
    return NextResponse.json({ project: updated });
  } catch (err) {
    if (err instanceof ProjectError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to configure project' },
      { status: 500 }
    );
  }
}
