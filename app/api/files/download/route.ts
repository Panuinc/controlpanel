import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { resolveAndValidatePathStrict, PathSecurityError } from '@/lib/file-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 });
  }

  try {
    const resolved = await resolveAndValidatePathStrict(filePath);
    const stats = await fs.stat(resolved);

    if (stats.isDirectory()) {
      return NextResponse.json({ error: 'Cannot download a directory' }, { status: 400 });
    }

    const content = await fs.readFile(resolved);
    const filename = path.basename(resolved);

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
      },
    });
  } catch (err) {
    if (err instanceof PathSecurityError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
