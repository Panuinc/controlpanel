import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { resolveAndValidatePathStrict, PathSecurityError } from '@/lib/file-utils';

export async function POST(req: NextRequest) {
  try {
    const { path: dirPath } = await req.json();

    if (!dirPath) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 });
    }

    const resolved = await resolveAndValidatePathStrict(dirPath);
    await fs.mkdir(resolved, { recursive: true });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof PathSecurityError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create directory' }, { status: 500 });
  }
}
