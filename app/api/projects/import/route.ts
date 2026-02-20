import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  validateProjectName,
  gitGetCurrentCommit,
  gitGetRemoteUrl,
  gitSetCredentials,
  detectFramework,
  findAvailablePort,
  sanitizeForPM2Name,
  loadProjects,
  saveProjects,
  ProjectError,
} from '@/lib/project-utils';
import type { ProjectConfig } from '@/types/projects';

export async function POST(req: NextRequest) {
  try {
    const { path: projectPath, name, gitUsername, gitToken } = await req.json();

    if (!projectPath || !name) {
      return NextResponse.json({ error: 'Project path and name are required' }, { status: 400 });
    }

    validateProjectName(name);

    // Check directory exists
    try {
      const stat = await fs.stat(projectPath);
      if (!stat.isDirectory()) {
        return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Directory does not exist' }, { status: 404 });
    }

    // Check if already imported
    const existing = await loadProjects();
    if (existing.some((p) => p.path === projectPath)) {
      return NextResponse.json({ error: 'This project is already imported' }, { status: 409 });
    }

    // Get git info
    let gitUrl = '';
    let commit = '';
    try {
      gitUrl = await gitGetRemoteUrl(projectPath);
      commit = await gitGetCurrentCommit(projectPath);

      // Set credentials if provided
      if (gitUsername && gitToken) {
        await gitSetCredentials(projectPath, gitUsername, gitToken);
      }
    } catch {
      // Not a git repo or no remote - that's ok
    }

    // Detect framework
    const detected = await detectFramework(projectPath);
    const port = detected.suggestedPort > 0 ? await findAvailablePort(detected.suggestedPort) : 0;

    const project: ProjectConfig = {
      id: randomUUID(),
      name,
      gitUrl,
      gitUsername: gitUsername || '',
      gitToken: gitToken || '',
      path: projectPath,
      domain: '',
      framework: detected.framework,
      port,
      installCommand: detected.installCommand,
      buildCommand: detected.buildCommand,
      startCommand: detected.startCommand,
      envVars: [],
      status: 'stopped',
      pm2Name: `cp-${sanitizeForPM2Name(name)}`,
      nginxConfigPath: '',
      sslEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastDeployedAt: null,
      currentCommit: commit,
      previousCommit: null,
      buildLog: '',
      errorMessage: '',
    };

    existing.push(project);
    await saveProjects(existing);

    return NextResponse.json({ project });
  } catch (err) {
    if (err instanceof ProjectError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Failed to import project:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to import project' },
      { status: 500 }
    );
  }
}
