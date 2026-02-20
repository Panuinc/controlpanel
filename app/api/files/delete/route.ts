import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { resolveAndValidatePathStrict, PathSecurityError } from '@/lib/file-utils';

export async function DELETE(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 });
  }

  try {
    const resolved = await resolveAndValidatePathStrict(filePath);
    const stats = await fs.lstat(resolved);

    if (stats.isDirectory()) {
      await fs.rm(resolved, { recursive: true });
    } else {
      await fs.unlink(resolved);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof PathSecurityError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
