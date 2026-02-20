import { execFile } from 'child_process';

const SERVICE_NAME_REGEX = /^[a-zA-Z0-9_@:.\-]+$/;
const ALLOWED_ACTIONS = ['start', 'stop', 'restart', 'enable', 'disable', 'status'];
const MAX_LOG_LINES = 10000;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateServiceName(name: string): void {
  if (!name || !SERVICE_NAME_REGEX.test(name)) {
    throw new ValidationError(`Invalid service name: ${name}`);
  }
}

function validateAction(action: string): void {
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw new ValidationError(`Invalid action: ${action}`);
  }
}

function execPromise(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 30000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function systemctl(action: string, service: string): Promise<string> {
  validateAction(action);
  validateServiceName(service);
  return execPromise('systemctl', [action, service]);
}

export async function systemctlShow(service: string): Promise<Record<string, string>> {
  validateServiceName(service);
  const output = await execPromise('systemctl', ['show', service, '--no-pager']);
  const props: Record<string, string> = {};
  for (const line of output.split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0) {
      props[line.substring(0, idx)] = line.substring(idx + 1);
    }
  }
  return props;
}

export async function listServices(): Promise<string> {
  return execPromise('systemctl', [
    'list-units', '--type=service', '--all', '--no-pager', '--no-legend',
  ]);
}

export async function getServiceLogs(service: string, lines: number = 100): Promise<string> {
  validateServiceName(service);
  const safeLines = Math.min(Math.max(1, lines), MAX_LOG_LINES);
  return execPromise('journalctl', ['-u', service, '-n', String(safeLines), '--no-pager']);
}
