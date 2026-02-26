import { execFile } from 'child_process';
import type { UFWRule, UFWStatus } from '@/types/firewall';

export class FirewallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirewallError';
  }
}

function execPromise(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

export async function getUFWStatus(): Promise<UFWStatus> {
  try {
    const output = await execPromise('ufw', ['status', 'numbered']);
    const active = output.includes('Status: active');
    const rules: UFWRule[] = [];

    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/\[\s*(\d+)\]\s+(.+?)\s+(ALLOW|DENY|REJECT|LIMIT)\s+(?:IN\s+)?(.+)/);
      if (match) {
        rules.push({
          number: parseInt(match[1]),
          to: match[2].trim(),
          action: match[3],
          from: match[4].trim(),
          comment: '',
        });
      }
    }

    return { active, rules };
  } catch (err) {
    if (err instanceof Error && (err.message.includes('ENOENT') || err.message.includes('not found'))) {
      throw new FirewallError('UFW is not installed on this system.');
    }
    throw err;
  }
}

const PORT_REGEX = /^(\d{1,5})(\/tcp|\/udp)?$/;
const PROTO_REGEX = /^(tcp|udp)$/;

export async function addRule(action: 'allow' | 'deny', port: string, protocol?: string, from?: string): Promise<string> {
  if (!['allow', 'deny'].includes(action)) {
    throw new FirewallError('Action must be allow or deny.');
  }

  if (!PORT_REGEX.test(port) && !['ssh', 'http', 'https'].includes(port.toLowerCase())) {
    throw new FirewallError('Invalid port specification.');
  }

  const args: string[] = [action];

  if (from && from !== 'Anywhere') {
    args.push('from', from);
    args.push('to', 'any');
    args.push('port', port.replace(/\/(tcp|udp)$/, ''));
  } else {
    args.push(port);
  }

  if (protocol && PROTO_REGEX.test(protocol) && !port.includes('/')) {
    args.push('proto', protocol);
  }

  return execPromise('ufw', args);
}

export async function deleteRule(ruleNumber: number): Promise<string> {
  if (ruleNumber < 1) throw new FirewallError('Invalid rule number.');
  return execPromise('ufw', ['--force', 'delete', String(ruleNumber)]);
}

export async function toggleFirewall(enable: boolean): Promise<string> {
  return execPromise('ufw', ['--force', enable ? 'enable' : 'disable']);
}
