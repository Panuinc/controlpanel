import { execFile } from 'child_process';
import type { Container, DockerImage, ContainerStats } from '@/types/docker';

export class DockerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DockerError';
  }
}

const CONTAINER_ID_REGEX = /^[a-f0-9]{6,64}$/;
const IMAGE_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.\-/]*(?::[a-zA-Z0-9._\-]+)?$/;

function execPromise(cmd: string, args: string[], timeout = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

function validateContainerId(id: string): void {
  const cleanId = id.trim();
  if (!CONTAINER_ID_REGEX.test(cleanId) && !IMAGE_NAME_REGEX.test(cleanId)) {
    throw new DockerError('Invalid container ID or name.');
  }
}

export async function listContainers(): Promise<Container[]> {
  try {
    const output = await execPromise('docker', ['ps', '-a', '--format', '{{json .}}']);
    if (!output.trim()) return [];

    return output.trim().split('\n').map((line) => {
      const c = JSON.parse(line);
      return {
        id: c.ID,
        name: c.Names,
        image: c.Image,
        status: c.Status,
        state: c.State?.toLowerCase() || 'unknown',
        ports: c.Ports || '',
        created: c.CreatedAt || c.RunningFor || '',
        size: c.Size || '',
      };
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      throw new DockerError('Docker is not installed on this system.');
    }
    throw err;
  }
}

export async function containerAction(id: string, action: 'start' | 'stop' | 'restart' | 'remove'): Promise<string> {
  validateContainerId(id);
  const validActions = ['start', 'stop', 'restart', 'remove'];
  if (!validActions.includes(action)) {
    throw new DockerError('Invalid action.');
  }
  const cmd = action === 'remove' ? 'rm' : action;
  const args = [cmd];
  if (action === 'remove') args.push('-f');
  args.push(id);
  return execPromise('docker', args);
}

export async function getContainerLogs(id: string, tail: number = 200): Promise<string> {
  validateContainerId(id);
  return execPromise('docker', ['logs', '--tail', String(Math.min(tail, 5000)), id]);
}

export async function listImages(): Promise<DockerImage[]> {
  const output = await execPromise('docker', ['images', '--format', '{{json .}}']);
  if (!output.trim()) return [];

  return output.trim().split('\n').map((line) => {
    const img = JSON.parse(line);
    return {
      id: img.ID,
      repository: img.Repository,
      tag: img.Tag,
      size: img.Size,
      created: img.CreatedSince || img.CreatedAt || '',
    };
  });
}

export async function pullImage(name: string): Promise<string> {
  if (!IMAGE_NAME_REGEX.test(name)) {
    throw new DockerError('Invalid image name.');
  }
  return execPromise('docker', ['pull', name], 300000);
}

export async function getContainerStats(): Promise<ContainerStats[]> {
  const output = await execPromise('docker', ['stats', '--no-stream', '--format', '{{json .}}']);
  if (!output.trim()) return [];

  return output.trim().split('\n').map((line) => {
    const s = JSON.parse(line);
    return {
      id: s.ID,
      name: s.Name,
      cpuPercent: s.CPUPerc,
      memUsage: s.MemUsage,
      memPercent: s.MemPerc,
      netIO: s.NetIO,
      blockIO: s.BlockIO,
    };
  });
}
