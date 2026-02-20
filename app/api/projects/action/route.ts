import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import {
  getProject,
  updateProject,
  deleteProjectData,
  gitPull,
  gitGetCurrentCommit,
  gitCheckout,
  runBuild,
  pm2Start,
  pm2Stop,
  pm2Restart,
  pm2Delete,
  saveBuildLog,
  ProjectError,
} from '@/lib/project-utils';
import {
  generateNginxConfig,
  writeNginxConfig,
  enableSite,
  deleteNginxConfig,
  reloadNginx,
} from '@/lib/nginx-utils';
import type { ProjectAction } from '@/types/projects';

const VALID_ACTIONS: ProjectAction[] = ['deploy', 'start', 'stop', 'restart', 'update', 'delete', 'rollback'];

export async function POST(req: NextRequest) {
  try {
    const { id, action } = await req.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'Project ID and action required' }, { status: 400 });
    }

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    switch (action) {
      case 'deploy': {
        await updateProject(id, { status: 'building', errorMessage: '' });

        const buildResult = await runBuild(project);
        await saveBuildLog(id, buildResult.output);

        if (!buildResult.success) {
          await updateProject(id, {
            status: 'error',
            errorMessage: 'Build failed',
            buildLog: buildResult.output.slice(-5000),
          });
          return NextResponse.json({ success: false, error: 'Build failed', output: buildResult.output });
        }

        // Setup nginx if domain is set
        if (project.domain) {
          const needsProxy = project.framework !== 'static' && project.framework !== 'php';
          const configName = project.domain;
          const nginxConfig = await generateNginxConfig({
            domain: project.domain,
            type: needsProxy ? 'proxy' : project.framework === 'php' ? 'php' : 'static',
            port: needsProxy ? project.port : undefined,
            rootPath: !needsProxy ? (project.buildCommand ? `${project.path}/dist` : project.path) : undefined,
            projectName: project.name,
          });

          await writeNginxConfig(configName, nginxConfig);
          await enableSite(configName);
          await reloadNginx();
          await updateProject(id, { nginxConfigPath: configName });
        }

        // Start PM2 process for non-static projects
        if (project.startCommand && project.framework !== 'static' && project.framework !== 'php') {
          try {
            await pm2Delete(project.pm2Name).catch(() => {});
            await pm2Start(project);
          } catch (err) {
            await updateProject(id, {
              status: 'error',
              errorMessage: `PM2 start failed: ${err instanceof Error ? err.message : String(err)}`,
            });
            return NextResponse.json({
              success: false,
              error: 'PM2 start failed',
              output: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const commit = await gitGetCurrentCommit(project.path).catch(() => project.currentCommit);
        await updateProject(id, {
          status: 'running',
          lastDeployedAt: new Date().toISOString(),
          currentCommit: commit,
          buildLog: buildResult.output.slice(-5000),
          errorMessage: '',
        });

        return NextResponse.json({ success: true, output: buildResult.output });
      }

      case 'start': {
        if (project.startCommand) {
          await pm2Start(project);
        }
        await updateProject(id, { status: 'running', errorMessage: '' });
        return NextResponse.json({ success: true });
      }

      case 'stop': {
        try {
          await pm2Stop(project.pm2Name);
        } catch { /* might not be running */ }
        await updateProject(id, { status: 'stopped' });
        return NextResponse.json({ success: true });
      }

      case 'restart': {
        try {
          await pm2Restart(project.pm2Name);
        } catch {
          // If restart fails, try start
          await pm2Start(project);
        }
        await updateProject(id, { status: 'running', errorMessage: '' });
        return NextResponse.json({ success: true });
      }

      case 'update': {
        await updateProject(id, { status: 'building', errorMessage: '' });

        const previousCommit = project.currentCommit;
        let pullOutput: string;
        try {
          pullOutput = await gitPull(project.path, project.gitUsername, project.gitToken);
        } catch (pullErr) {
          const msg = pullErr instanceof Error ? pullErr.message : String(pullErr);
          await updateProject(id, { status: 'error', errorMessage: `Git pull failed: ${msg}` });
          return NextResponse.json({ success: false, error: 'Git pull failed', output: msg });
        }

        const buildResult = await runBuild(project);
        await saveBuildLog(id, pullOutput + '\n' + buildResult.output);

        if (!buildResult.success) {
          await updateProject(id, {
            status: 'error',
            errorMessage: 'Update build failed',
            buildLog: buildResult.output.slice(-5000),
          });
          return NextResponse.json({ success: false, error: 'Build failed', output: buildResult.output });
        }

        if (project.startCommand && project.framework !== 'static' && project.framework !== 'php') {
          try {
            await pm2Restart(project.pm2Name);
          } catch {
            await pm2Start(project);
          }
        }

        if (project.domain) {
          await reloadNginx().catch(() => {});
        }

        const newCommit = await gitGetCurrentCommit(project.path).catch(() => previousCommit);
        await updateProject(id, {
          status: 'running',
          lastDeployedAt: new Date().toISOString(),
          currentCommit: newCommit,
          previousCommit,
          buildLog: buildResult.output.slice(-5000),
          errorMessage: '',
        });

        return NextResponse.json({ success: true, output: buildResult.output });
      }

      case 'rollback': {
        if (!project.previousCommit) {
          return NextResponse.json({ error: 'No previous commit to rollback to' }, { status: 400 });
        }

        await updateProject(id, { status: 'building', errorMessage: '' });
        await gitCheckout(project.path, project.previousCommit);

        const buildResult = await runBuild(project);
        await saveBuildLog(id, buildResult.output);

        if (!buildResult.success) {
          await updateProject(id, { status: 'error', errorMessage: 'Rollback build failed' });
          return NextResponse.json({ success: false, error: 'Rollback build failed' });
        }

        if (project.startCommand && project.framework !== 'static' && project.framework !== 'php') {
          try {
            await pm2Restart(project.pm2Name);
          } catch {
            await pm2Start(project);
          }
        }

        const commit = await gitGetCurrentCommit(project.path).catch(() => project.previousCommit!);
        await updateProject(id, {
          status: 'running',
          currentCommit: commit,
          previousCommit: project.currentCommit,
          lastDeployedAt: new Date().toISOString(),
          errorMessage: '',
        });

        return NextResponse.json({ success: true });
      }

      case 'delete': {
        // Stop PM2 process
        try {
          await pm2Delete(project.pm2Name);
        } catch { /* might not exist */ }

        // Remove nginx config
        if (project.nginxConfigPath) {
          try {
            await deleteNginxConfig(project.nginxConfigPath);
            await reloadNginx();
          } catch { /* might not exist */ }
        }

        // Remove project files
        try {
          await fs.rm(project.path, { recursive: true, force: true });
        } catch { /* might not exist */ }

        // Remove from data
        await deleteProjectData(id);

        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    if (err instanceof ProjectError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Project action failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed' },
      { status: 500 }
    );
  }
}
