import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { resolveAndValidatePathStrict, PathSecurityError } from '@/lib/file-utils';
import type { FileEntry } from '@/types/files';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const dirPath = req.nextUrl.searchParams.get('path') || '/';

  try {
    const resolved = await resolveAndValidatePathStrict(dirPath);
    const entries = await fs.readdir(resolved, { withFileTypes: true });

    const files: FileEntry[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(resolved, entry.name);
        let stats;
        try {
          stats = await fs.lstat(fullPath);
        } catch {
          stats = null;
        }
        return {
          name: entry.name,
          path: path.join(dirPath, entry.name),
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
          size: stats?.size || 0,
          modified: stats?.mtime.toISOString() || '',
          permissions: stats ? (stats.mode & 0o777).toString(8) : '',
        };
      })
    );

    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ files, path: dirPath });
  } catch (err) {
    if (err instanceof PathSecurityError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to list directory' }, { status: 500 });
  }
}
