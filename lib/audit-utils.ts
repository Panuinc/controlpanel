import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { PROJECTS_DATA_DIR, AUDIT_LOG_FILE, AUDIT_MAX_ENTRIES, JWT_SECRET } from './constants';
import type { AuditEntry, AuditCategory } from '@/types/audit';

function getAuditFilePath(): string {
  return path.join(PROJECTS_DATA_DIR, AUDIT_LOG_FILE);
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DATA_DIR, { recursive: true });
}

async function loadAuditLog(): Promise<AuditEntry[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(getAuditFilePath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveAuditLog(entries: AuditEntry[]): Promise<void> {
  await ensureDataDir();
  const filePath = getAuditFilePath();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(entries, null, 2));
  await fs.rename(tmpPath, filePath);
}

async function extractUserFromRequest(req: NextRequest): Promise<{ userId: string; username: string }> {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return { userId: 'unknown', username: 'unknown' };
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: (payload.userId as string) || 'unknown',
      username: (payload.sub as string) || (payload.username as string) || 'unknown',
    };
  } catch {
    return { userId: 'unknown', username: 'unknown' };
  }
}

export async function logAudit(
  req: NextRequest,
  action: string,
  category: AuditCategory,
  target: string,
  details: string,
  result: 'success' | 'failure'
): Promise<void> {
  try {
    const { userId, username } = await extractUserFromRequest(req);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      username,
      action,
      category,
      target,
      details,
      result,
      ip,
    };

    const entries = await loadAuditLog();
    entries.unshift(entry);

    if (entries.length > AUDIT_MAX_ENTRIES) {
      entries.length = AUDIT_MAX_ENTRIES;
    }

    await saveAuditLog(entries);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export async function getAuditEntries(options?: {
  category?: string;
  username?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: AuditEntry[]; total: number }> {
  let entries = await loadAuditLog();

  if (options?.category) {
    entries = entries.filter((e) => e.category === options.category);
  }
  if (options?.username) {
    entries = entries.filter((e) => e.username === options.username);
  }

  const total = entries.length;
  const offset = options?.offset || 0;
  const limit = options?.limit || 50;

  return {
    entries: entries.slice(offset, offset + limit),
    total,
  };
}
