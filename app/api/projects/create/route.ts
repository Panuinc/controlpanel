import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import {
  validateProjectName,
  validateGitUrl,
  gitClone,
  gitGetCurrentCommit,
  detectFramework,
  findAvailablePort,
  sanitizeForPM2Name,
  loadProjects,
  saveProjects,
  ProjectError,
} from '@/lib/project-utils';
import { DEFAULT_PROJECT_DIR } from '@/lib/constants';
import type { ProjectConfig } from '@/types/projects';

export async function POST(req: NextRequest) {
  try {
    const { gitUrl, name, targetDir } = await req.json();

    if (!gitUrl || !name) {
      return NextResponse.json({ error: 'Git URL and project name are required' }, { status: 400 });
    }

    validateProjectName(name);
    validateGitUrl(gitUrl);

    const baseDir = targetDir || DEFAULT_PROJECT_DIR;
    const projectPath = path.join(baseDir, name);

    // Check if directory already exists
    try {
      await fs.access(projectPath);
      return NextResponse.json({ error: 'Directory already exists' }, { status: 409 });
    } catch { /* good, doesn't exist */ }

    // Ensure base directory exists
    await fs.mkdir(baseDir, { recursive: true });

    // Clone repository
    await gitClone(gitUrl, projectPath);

    // Detect framework
    const detected = await detectFramework(projectPath);
    const commit = await gitGetCurrentCommit(projectPath);
    const port = detected.suggestedPort > 0 ? await findAvailablePort(detected.suggestedPort) : 0;

    const project: ProjectConfig = {
      id: randomUUID(),
      name,
      gitUrl,
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

    const projects = await loadProjects();
    projects.push(project);
    await saveProjects(projects);

    return NextResponse.json({ project });
  } catch (err) {
    if (err instanceof ProjectError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Failed to create project:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}
