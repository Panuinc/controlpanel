import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { resolveAndValidatePathStrict, PathSecurityError } from '@/lib/file-utils';

export async function POST(req: NextRequest) {
  try {
    const { path: filePath, content } = await req.json();

    if (!filePath || typeof content !== 'string') {
      return NextResponse.json({ error: 'Path and content required' }, { status: 400 });
    }

    const resolved = await resolveAndValidatePathStrict(filePath);
    await fs.writeFile(resolved, content, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof PathSecurityError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to write file' }, { status: 500 });
  }
}
