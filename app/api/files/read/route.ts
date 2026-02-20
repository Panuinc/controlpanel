import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { resolveAndValidatePathStrict, PathSecurityError } from '@/lib/file-utils';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 });
  }

  try {
    const resolved = await resolveAndValidatePathStrict(filePath);
    const stats = await fs.stat(resolved);

    if (stats.isDirectory()) {
      return NextResponse.json({ error: 'Cannot read a directory' }, { status: 400 });
    }

    if (stats.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 413 });
    }

    const content = await fs.readFile(resolved, 'utf-8');
    return NextResponse.json({ content, size: stats.size, path: filePath });
  } catch (err) {
    if (err instanceof PathSecurityError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
