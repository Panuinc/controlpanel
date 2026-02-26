import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { PROJECTS_DATA_DIR, BACKUPS_DIR, BACKUPS_INDEX_FILE, BACKUP_MAX_COUNT } from './constants';
import type { BackupEntry } from '@/types/backup';

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

function execPromise(cmd: string, args: string[], timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

function getBackupsDir(projectId: string): string {
  return path.join(PROJECTS_DATA_DIR, BACKUPS_DIR, projectId);
}

function getIndexPath(): string {
  return path.join(PROJECTS_DATA_DIR, BACKUPS_INDEX_FILE);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function loadIndex(): Promise<BackupEntry[]> {
  try {
    const data = await fs.readFile(getIndexPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveIndex(entries: BackupEntry[]): Promise<void> {
  const filePath = getIndexPath();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(entries, null, 2));
  await fs.rename(tmpPath, filePath);
}

export async function listBackups(projectId?: string): Promise<BackupEntry[]> {
  const entries = await loadIndex();
  if (projectId) return entries.filter((e) => e.projectId === projectId);
  return entries;
}

export async function createBackup(projectId: string, projectName: string, projectPath: string, currentCommit: string): Promise<BackupEntry> {
  const backupsDir = getBackupsDir(projectId);
  await ensureDir(backupsDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${projectName}-${timestamp}.tar.gz`;
  const backupPath = path.join(backupsDir, filename);

  try {
    await execPromise('tar', ['-czf', backupPath, '-C', path.dirname(projectPath), path.basename(projectPath)]);
  } catch (err) {
    throw new BackupError(`Failed to create backup: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  const stats = await fs.stat(backupPath);
  const entry: BackupEntry = {
    id: crypto.randomUUID(),
    projectId,
    projectName,
    filename,
    size: stats.size,
    createdAt: new Date().toISOString(),
    commit: currentCommit,
  };

  const entries = await loadIndex();
  entries.unshift(entry);

  // Enforce max backups per project
  const projectBackups = entries.filter((e) => e.projectId === projectId);
  if (projectBackups.length > BACKUP_MAX_COUNT) {
    const toRemove = projectBackups.slice(BACKUP_MAX_COUNT);
    for (const old of toRemove) {
      try {
        await fs.unlink(path.join(backupsDir, old.filename));
      } catch {
        // ignore
      }
    }
    const removeIds = new Set(toRemove.map((e) => e.id));
    const filtered = entries.filter((e) => !removeIds.has(e.id));
    await saveIndex(filtered);
  } else {
    await saveIndex(entries);
  }

  return entry;
}

export async function restoreBackup(backupId: string, targetPath: string): Promise<void> {
  const entries = await loadIndex();
  const entry = entries.find((e) => e.id === backupId);
  if (!entry) throw new BackupError('Backup not found.');

  const backupPath = path.join(getBackupsDir(entry.projectId), entry.filename);
  try {
    await fs.access(backupPath);
  } catch {
    throw new BackupError('Backup file not found on disk.');
  }

  await execPromise('tar', ['-xzf', backupPath, '-C', path.dirname(targetPath)]);
}

export async function deleteBackup(backupId: string): Promise<void> {
  const entries = await loadIndex();
  const entry = entries.find((e) => e.id === backupId);
  if (!entry) throw new BackupError('Backup not found.');

  const backupPath = path.join(getBackupsDir(entry.projectId), entry.filename);
  try {
    await fs.unlink(backupPath);
  } catch {
    // ignore
  }

  const filtered = entries.filter((e) => e.id !== backupId);
  await saveIndex(filtered);
}

export function getBackupFilePath(entry: BackupEntry): string {
  return path.join(getBackupsDir(entry.projectId), entry.filename);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
