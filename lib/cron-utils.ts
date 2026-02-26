import { execFile } from 'child_process';
import crypto from 'crypto';
import type { CronJob } from '@/types/cron';

export class CronError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CronError';
  }
}

function execPromise(cmd: string, args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile(cmd, args, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        if (stderr.includes('no crontab for')) {
          resolve('');
          return;
        }
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
    if (input !== undefined && proc.stdin) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
  });
}

export function parseCrontab(content: string): CronJob[] {
  const jobs: CronJob[] = [];
  const lines = content.split('\n');
  let lastComment = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#')) {
      lastComment = trimmed.replace(/^#\s*/, '');
      continue;
    }

    const match = trimmed.match(/^([*\d/,\-]+)\s+([*\d/,\-]+)\s+([*\d/,\-]+)\s+([*\d/,\-]+)\s+([*\d/,\-]+)\s+(.+)$/);
    if (match) {
      jobs.push({
        id: crypto.randomUUID(),
        minute: match[1],
        hour: match[2],
        dayOfMonth: match[3],
        month: match[4],
        dayOfWeek: match[5],
        command: match[6],
        comment: lastComment,
        enabled: true,
      });
      lastComment = '';
      continue;
    }

    const disabledMatch = trimmed.match(/^#\s*([*\d/,\-]+)\s+([*\d/,\-]+)\s+([*\d/,\-]+)\s+([*\d/,\-]+)\s+([*\d/,\-]+)\s+(.+)$/);
    if (disabledMatch) {
      jobs.push({
        id: crypto.randomUUID(),
        minute: disabledMatch[1],
        hour: disabledMatch[2],
        dayOfMonth: disabledMatch[3],
        month: disabledMatch[4],
        dayOfWeek: disabledMatch[5],
        command: disabledMatch[6],
        comment: lastComment,
        enabled: false,
      });
      lastComment = '';
    }
  }

  return jobs;
}

function jobToCrontabLine(job: CronJob): string {
  const schedule = `${job.minute} ${job.hour} ${job.dayOfMonth} ${job.month} ${job.dayOfWeek} ${job.command}`;
  const lines: string[] = [];
  if (job.comment) lines.push(`# ${job.comment}`);
  lines.push(job.enabled ? schedule : `# ${schedule}`);
  return lines.join('\n');
}

function jobsToCrontab(jobs: CronJob[]): string {
  return jobs.map(jobToCrontabLine).join('\n') + '\n';
}

export async function listCronJobs(): Promise<CronJob[]> {
  const content = await execPromise('crontab', ['-l']);
  return parseCrontab(content);
}

export async function saveCronJobs(jobs: CronJob[]): Promise<void> {
  const content = jobsToCrontab(jobs);
  await execPromise('crontab', ['-'], content);
}

export async function addCronJob(job: Omit<CronJob, 'id' | 'enabled'>): Promise<CronJob[]> {
  validateCronField(job.minute, 0, 59, 'minute');
  validateCronField(job.hour, 0, 23, 'hour');
  validateCronField(job.dayOfMonth, 1, 31, 'day of month');
  validateCronField(job.month, 1, 12, 'month');
  validateCronField(job.dayOfWeek, 0, 7, 'day of week');

  if (!job.command || job.command.trim().length === 0) {
    throw new CronError('Command is required.');
  }

  const jobs = await listCronJobs();
  const newJob: CronJob = { ...job, id: crypto.randomUUID(), enabled: true };
  jobs.push(newJob);
  await saveCronJobs(jobs);
  return jobs;
}

export async function deleteCronJob(id: string): Promise<CronJob[]> {
  const jobs = await listCronJobs();
  const filtered = jobs.filter((j) => j.id !== id);
  if (filtered.length === jobs.length) throw new CronError('Cron job not found.');
  await saveCronJobs(filtered);
  return filtered;
}

function validateCronField(value: string, min: number, max: number, name: string): void {
  if (value === '*') return;
  const cronFieldRegex = /^[0-9*,/\-]+$/;
  if (!cronFieldRegex.test(value)) {
    throw new CronError(`Invalid ${name} field: ${value}`);
  }
}

export function describeSchedule(job: CronJob): string {
  const { minute, hour, dayOfMonth, month, dayOfWeek } = job;

  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }

  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${minute.slice(2)} minutes`;
  }

  if (hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${hour.slice(2)} hours at minute ${minute}`;
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[parseInt(dayOfWeek)] || dayOfWeek;
    return `Every ${dayName} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}
