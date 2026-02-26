import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { PROJECTS_DATA_DIR, DATABASE_CONNECTIONS_FILE, JWT_SECRET } from './constants';
import type { SupabaseConnection, SupabaseConnectionPublic, TableInfo, ColumnInfo, QueryResult } from '@/types/database';

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(JWT_SECRET).digest();
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(data: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getFilePath(): string {
  return path.join(PROJECTS_DATA_DIR, DATABASE_CONNECTIONS_FILE);
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DATA_DIR, { recursive: true });
}

async function loadConnections(): Promise<SupabaseConnection[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(getFilePath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveConnections(connections: SupabaseConnection[]): Promise<void> {
  await ensureDataDir();
  const filePath = getFilePath();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(connections, null, 2));
  await fs.rename(tmpPath, filePath);
}

export async function getConnections(): Promise<SupabaseConnectionPublic[]> {
  const connections = await loadConnections();
  return connections.map((c) => ({
    id: c.id,
    name: c.name,
    projectUrl: c.projectUrl,
    hasServiceRoleKey: !!c.serviceRoleKey,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

export async function getConnection(id: string): Promise<SupabaseConnection | null> {
  const connections = await loadConnections();
  const conn = connections.find((c) => c.id === id);
  if (!conn) return null;
  return {
    ...conn,
    anonKey: decrypt(conn.anonKey),
    serviceRoleKey: conn.serviceRoleKey ? decrypt(conn.serviceRoleKey) : '',
  };
}

export async function addConnection(name: string, projectUrl: string, anonKey: string, serviceRoleKey?: string): Promise<SupabaseConnectionPublic> {
  if (!name || !projectUrl || !anonKey) {
    throw new DatabaseError('Name, project URL, and anon key are required.');
  }

  const urlRegex = /^https:\/\/[a-zA-Z0-9\-]+\.supabase\.co$/;
  if (!urlRegex.test(projectUrl)) {
    throw new DatabaseError('Invalid Supabase project URL. Format: https://<project-ref>.supabase.co');
  }

  const connections = await loadConnections();
  const conn: SupabaseConnection = {
    id: crypto.randomUUID(),
    name,
    projectUrl,
    anonKey: encrypt(anonKey),
    serviceRoleKey: serviceRoleKey ? encrypt(serviceRoleKey) : '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  connections.push(conn);
  await saveConnections(connections);

  return {
    id: conn.id,
    name: conn.name,
    projectUrl: conn.projectUrl,
    hasServiceRoleKey: !!serviceRoleKey,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  };
}

export async function deleteConnection(id: string): Promise<void> {
  const connections = await loadConnections();
  const filtered = connections.filter((c) => c.id !== id);
  if (filtered.length === connections.length) throw new DatabaseError('Connection not found.');
  await saveConnections(filtered);
}

export async function fetchTables(connectionId: string): Promise<TableInfo[]> {
  const conn = await getConnection(connectionId);
  if (!conn) throw new DatabaseError('Connection not found.');

  const key = conn.serviceRoleKey || conn.anonKey;
  const res = await fetch(`${conn.projectUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'get_tables_info',
    }),
  });

  // Fallback: query information_schema directly
  const sqlRes = await fetch(`${conn.projectUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      query: `SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    }),
  });

  if (sqlRes.ok) {
    const data = await sqlRes.json();
    const tables: TableInfo[] = [];
    const rows = Array.isArray(data) ? data : (data.result || []);
    for (const row of rows) {
      const tableName = row.table_name;
      const columns = await fetchColumns(conn, tableName, key);
      tables.push({
        name: tableName,
        schema: row.table_schema || 'public',
        rowCount: null,
        columns,
      });
    }
    return tables;
  }

  // Further fallback: use REST API to discover tables
  if (!res.ok) {
    const apiRes = await fetch(`${conn.projectUrl}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.definitions) {
        return Object.keys(data.definitions).map((name) => ({
          name,
          schema: 'public',
          rowCount: null,
          columns: [],
        }));
      }
    }
  }

  return [];
}

async function fetchColumns(conn: SupabaseConnection, tableName: string, key: string): Promise<ColumnInfo[]> {
  try {
    const res = await fetch(`${conn.projectUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName.replace(/'/g, "''")}' ORDER BY ordinal_position`,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.result || []);
      return rows.map((r: Record<string, string>) => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === 'YES',
        defaultValue: r.column_default,
        isPrimaryKey: false,
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

export async function queryTable(connectionId: string, table: string, limit: number = 50, offset: number = 0): Promise<QueryResult> {
  const conn = await getConnection(connectionId);
  if (!conn) throw new DatabaseError('Connection not found.');

  const key = conn.serviceRoleKey || conn.anonKey;
  const res = await fetch(
    `${conn.projectUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=${limit}&offset=${offset}`,
    {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'count=exact',
      },
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new DatabaseError(err.message || 'Query failed.');
  }

  const rows = await res.json();
  const contentRange = res.headers.get('content-range');
  const total = contentRange ? parseInt(contentRange.split('/')[1]) || rows.length : rows.length;
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return { columns, rows, rowCount: total };
}

export async function executeSQL(connectionId: string, sql: string): Promise<QueryResult> {
  const conn = await getConnection(connectionId);
  if (!conn) throw new DatabaseError('Connection not found.');

  const key = conn.serviceRoleKey || conn.anonKey;
  const res = await fetch(`${conn.projectUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const err = await res.json();
    return { columns: [], rows: [], rowCount: 0, error: err.message || 'Query execution failed.' };
  }

  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.result || []);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return { columns, rows, rowCount: rows.length };
}
