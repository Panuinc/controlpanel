import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { PROJECTS_DATA_DIR, DEFAULT_APP_PORT_START, PM2_PATH, GIT_PATH } from './constants';
import type { ProjectConfig, FrameworkType } from '@/types/projects';

export class ProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectError';
  }
}

// --- Validation ---

const PROJECT_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,62}$/;
const GIT_URL_REGEX = /^(https?:\/\/[a-zA-Z0-9._\-:@\/]+|git@[a-zA-Z0-9._\-]+:[a-zA-Z0-9._\-\/]+)$/;

export function validateProjectName(name: string): void {
  if (!name || !PROJECT_NAME_REGEX.test(name)) {
    throw new ProjectError('Invalid project name. Use only letters, numbers, hyphens, and underscores.');
  }
}

export function validateGitUrl(url: string): void {
  if (!url || !GIT_URL_REGEX.test(url)) {
    throw new ProjectError('Invalid Git URL. Use HTTPS or SSH format.');
  }
}

export function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new ProjectError('Port must be between 1024 and 65535');
  }
}

export function sanitizeForPM2Name(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '-').toLowerCase();
}

// --- Exec Helper ---

function execPromise(
  cmd: string,
  args: string[],
  options?: { timeout?: number; cwd?: string; env?: Record<string, string>; maxBuffer?: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const opts = {
      timeout: options?.timeout || 30000,
      maxBuffer: options?.maxBuffer || 10 * 1024 * 1024,
      cwd: options?.cwd,
      env: options?.env ? { ...process.env, ...options.env } : undefined,
    };
    execFile(cmd, args, opts, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

// --- Data Persistence ---

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DATA_DIR, { recursive: true });
  await fs.mkdir(path.join(PROJECTS_DATA_DIR, 'logs'), { recursive: true });
}

function getProjectsFilePath(): string {
  return path.join(PROJECTS_DATA_DIR, 'projects.json');
}

export async function loadProjects(): Promise<ProjectConfig[]> {
  await ensureDataDir();
  const filePath = getProjectsFilePath();
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveProjects(projects: ProjectConfig[]): Promise<void> {
  await ensureDataDir();
  const filePath = getProjectsFilePath();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(projects, null, 2));
  await fs.rename(tmpPath, filePath);
}

export async function getProject(id: string): Promise<ProjectConfig | null> {
  const projects = await loadProjects();
  return projects.find((p) => p.id === id) || null;
}

export async function updateProject(id: string, updates: Partial<ProjectConfig>): Promise<ProjectConfig> {
  const projects = await loadProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) throw new ProjectError('Project not found');
  projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
  await saveProjects(projects);
  return projects[index];
}

export async function deleteProjectData(id: string): Promise<void> {
  const projects = await loadProjects();
  await saveProjects(projects.filter((p) => p.id !== id));
}

// --- Build Logs ---

export async function saveBuildLog(projectId: string, output: string): Promise<string> {
  await ensureDataDir();
  const logFile = path.join(PROJECTS_DATA_DIR, 'logs', `${projectId}-${Date.now()}.log`);
  await fs.writeFile(logFile, output);
  return logFile;
}

export async function getBuildLogs(projectId: string): Promise<string> {
  const logsDir = path.join(PROJECTS_DATA_DIR, 'logs');
  try {
    const files = await fs.readdir(logsDir);
    const projectLogs = files
      .filter((f) => f.startsWith(projectId))
      .sort()
      .reverse();
    if (projectLogs.length === 0) return 'No build logs found.';
    const latest = await fs.readFile(path.join(logsDir, projectLogs[0]), 'utf-8');
    return latest;
  } catch {
    return 'No build logs found.';
  }
}

// --- Git Credentials ---

function buildAuthUrl(url: string, username: string, token: string): string {
  // Convert https://github.com/user/repo.git to https://username:token@github.com/user/repo.git
  try {
    const parsed = new URL(url);
    parsed.username = encodeURIComponent(username);
    parsed.password = encodeURIComponent(token);
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function gitSetCredentials(projectPath: string, username: string, token: string): Promise<void> {
  if (!username || !token) return;

  // Get current remote URL
  const remoteUrl = (await execPromise(GIT_PATH, ['remote', 'get-url', 'origin'], { cwd: projectPath })).trim();

  // Only update HTTPS URLs
  if (remoteUrl.startsWith('http')) {
    const authUrl = buildAuthUrl(remoteUrl, username, token);
    await execPromise(GIT_PATH, ['remote', 'set-url', 'origin', authUrl], { cwd: projectPath });
  }
}

export async function gitGetRemoteUrl(projectPath: string): Promise<string> {
  try {
    const url = (await execPromise(GIT_PATH, ['remote', 'get-url', 'origin'], { cwd: projectPath })).trim();
    // Strip credentials from URL for display
    try {
      const parsed = new URL(url);
      parsed.username = '';
      parsed.password = '';
      return parsed.toString();
    } catch {
      return url;
    }
  } catch {
    return '';
  }
}

// --- Git Operations ---

export async function gitClone(url: string, targetPath: string, username?: string, token?: string): Promise<string> {
  validateGitUrl(url);
  const cloneUrl = username && token ? buildAuthUrl(url, username, token) : url;
  return execPromise(GIT_PATH, ['clone', cloneUrl, targetPath], { timeout: 120000 });
}

export async function gitPull(projectPath: string, username?: string, token?: string): Promise<string> {
  if (username && token) {
    await gitSetCredentials(projectPath, username, token);
  }
  // Ensure we're on a branch (not detached HEAD from rollback)
  const branch = await execPromise(GIT_PATH, ['branch', '--show-current'], { cwd: projectPath }).then(b => b.trim());
  if (!branch) {
    // Detached HEAD - checkout default branch first
    const defaultBranch = await execPromise(GIT_PATH, ['rev-parse', '--abbrev-ref', 'origin/HEAD'], { cwd: projectPath })
      .then(b => b.trim().replace('origin/', ''))
      .catch(() => 'main');
    await execPromise(GIT_PATH, ['checkout', defaultBranch], { cwd: projectPath });
  }
  // Reset local changes (e.g. package-lock.json modified by npm install) before pulling
  await execPromise(GIT_PATH, ['reset', '--hard', 'HEAD'], { cwd: projectPath });
  await execPromise(GIT_PATH, ['clean', '-fd'], { cwd: projectPath });
  return execPromise(GIT_PATH, ['pull'], { cwd: projectPath, timeout: 60000 });
}

export async function gitGetCurrentCommit(projectPath: string): Promise<string> {
  const output = await execPromise(GIT_PATH, ['rev-parse', '--short', 'HEAD'], { cwd: projectPath });
  return output.trim();
}

export async function gitGetBranch(projectPath: string): Promise<string> {
  const output = await execPromise(GIT_PATH, ['branch', '--show-current'], { cwd: projectPath });
  return output.trim();
}

export async function gitCheckout(projectPath: string, ref: string): Promise<string> {
  return execPromise(GIT_PATH, ['checkout', ref], { cwd: projectPath });
}

// --- Framework Detection ---

export async function detectFramework(projectPath: string): Promise<{
  framework: FrameworkType;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
  suggestedPort: number;
}> {
  // Check package.json (Node.js)
  try {
    const pkgRaw = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const scripts = pkg.scripts || {};

    let buildCmd = scripts.build ? 'npm run build' : '';
    let startCmd = scripts.start ? 'npm start' : 'node index.js';
    let port = 3000;

    if (deps.next) {
      buildCmd = 'npm run build';
      startCmd = 'npm start';
      port = 3000;
    } else if (deps.vite || deps['@vitejs/plugin-react']) {
      buildCmd = 'npm run build';
      startCmd = '';
      return { framework: 'static', installCommand: 'npm install', buildCommand: buildCmd, startCommand: startCmd, suggestedPort: 0 };
    } else if (deps.express || deps.fastify || deps.koa) {
      port = 3000;
    }

    return { framework: 'nodejs', installCommand: 'npm install', buildCommand: buildCmd, startCommand: startCmd, suggestedPort: port };
  } catch { /* not Node.js */ }

  // Check requirements.txt (Python)
  try {
    await fs.access(path.join(projectPath, 'requirements.txt'));
    return {
      framework: 'python',
      installCommand: 'pip install -r requirements.txt',
      buildCommand: '',
      startCommand: 'python app.py',
      suggestedPort: 8000,
    };
  } catch { /* not Python */ }

  // Check composer.json (PHP)
  try {
    await fs.access(path.join(projectPath, 'composer.json'));
    return {
      framework: 'php',
      installCommand: 'composer install',
      buildCommand: '',
      startCommand: '',
      suggestedPort: 0,
    };
  } catch { /* not PHP */ }

  // Check index.html (Static)
  try {
    await fs.access(path.join(projectPath, 'index.html'));
    return {
      framework: 'static',
      installCommand: '',
      buildCommand: '',
      startCommand: '',
      suggestedPort: 0,
    };
  } catch { /* not static */ }

  return {
    framework: 'unknown',
    installCommand: '',
    buildCommand: '',
    startCommand: '',
    suggestedPort: 3000,
  };
}

// --- PM2 Management ---

export async function pm2Start(project: ProjectConfig): Promise<string> {
  const envArgs: string[] = [];
  for (const ev of project.envVars) {
    envArgs.push(`${ev.key}=${ev.value}`);
  }

  const parts = project.startCommand.split(' ');
  const args = [
    'start', parts[0],
    '--name', project.pm2Name,
    '--cwd', project.path,
  ];
  if (parts.length > 1) {
    args.push('--');
    args.push(...parts.slice(1));
  }

  const env: Record<string, string> = { PORT: String(project.port) };
  for (const ev of project.envVars) {
    env[ev.key] = ev.value;
  }

  return execPromise(PM2_PATH, args, { env });
}

export async function pm2Stop(pm2Name: string): Promise<string> {
  return execPromise(PM2_PATH, ['stop', pm2Name]);
}

export async function pm2Restart(pm2Name: string): Promise<string> {
  return execPromise(PM2_PATH, ['restart', pm2Name]);
}

export async function pm2Delete(pm2Name: string): Promise<string> {
  return execPromise(PM2_PATH, ['delete', pm2Name]);
}

export async function pm2Status(pm2Name: string): Promise<{ status: string; cpu: number; memory: number } | null> {
  try {
    const output = await execPromise(PM2_PATH, ['jlist']);
    const list = JSON.parse(output);
    const proc = list.find((p: { name: string }) => p.name === pm2Name);
    if (!proc) return null;
    return {
      status: proc.pm2_env?.status || 'unknown',
      cpu: proc.monit?.cpu || 0,
      memory: proc.monit?.memory || 0,
    };
  } catch {
    return null;
  }
}

// --- Port Management ---

export async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const output = await execPromise('ss', ['-tlnp']);
    return !output.includes(`:${port} `);
  } catch {
    return true;
  }
}

export async function findAvailablePort(startPort: number = DEFAULT_APP_PORT_START): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new ProjectError('No available ports found');
}

// --- Env File Parsing ---

function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadProjectEnv(project: ProjectConfig): Promise<Record<string, string>> {
  const env: Record<string, string> = {};

  // Load .env files (same priority as Next.js: .env < .env.local)
  for (const envFile of ['.env', '.env.local']) {
    try {
      const content = await fs.readFile(path.join(project.path, envFile), 'utf-8');
      Object.assign(env, parseEnvFile(content));
    } catch { /* file doesn't exist */ }
  }

  // Project configured env vars take highest priority
  for (const ev of project.envVars) {
    env[ev.key] = ev.value;
  }

  // Always set PORT
  if (project.port > 0) {
    env.PORT = String(project.port);
  }

  return env;
}

// --- Build & Deploy ---

export async function runBuild(project: ProjectConfig): Promise<{ success: boolean; output: string }> {
  let output = '';

  // Load env vars from .env files + project config
  const buildEnv = await loadProjectEnv(project);

  try {
    // Install dependencies
    if (project.installCommand) {
      output += `\n=== Installing dependencies ===\n$ ${project.installCommand}\n`;
      const installParts = project.installCommand.split(' ');
      const installOut = await execPromise(installParts[0], installParts.slice(1), {
        cwd: project.path,
        timeout: 300000,
        env: buildEnv,
      });
      output += installOut;
    }

    // Build
    if (project.buildCommand) {
      output += `\n=== Building project ===\n$ ${project.buildCommand}\n`;
      const buildParts = project.buildCommand.split(' ');
      const buildOut = await execPromise(buildParts[0], buildParts.slice(1), {
        cwd: project.path,
        timeout: 300000,
        env: buildEnv,
      });
      output += buildOut;
    }

    // Link Next.js standalone static files if standalone output exists
    const standaloneDir = path.join(project.path, '.next', 'standalone');
    try {
      await fs.access(standaloneDir);
      const staticSrc = path.join(project.path, '.next', 'static');
      const staticDst = path.join(standaloneDir, '.next', 'static');
      const publicSrc = path.join(project.path, 'public');
      const publicDst = path.join(standaloneDir, 'public');
      await fs.rm(staticDst, { recursive: true, force: true });
      await fs.symlink(staticSrc, staticDst);
      await fs.rm(publicDst, { recursive: true, force: true }).catch(() => {});
      await fs.symlink(publicSrc, publicDst).catch(() => {});
      output += '\n=== Linked standalone static files ===\n';
    } catch { /* not a standalone build, skip */ }

    output += '\n=== Build completed successfully ===\n';
    return { success: true, output };
  } catch (err) {
    output += `\n=== Build failed ===\n${err instanceof Error ? err.message : String(err)}\n`;
    return { success: false, output };
  }
}
