import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { resolveAndValidatePathStrict, PathSecurityError } from '@/lib/file-utils';

export async function POST(req: NextRequest) {
  try {
    const { oldPath, newPath } = await req.json();

    if (!oldPath || !newPath) {
      return NextResponse.json({ error: 'oldPath and newPath required' }, { status: 400 });
    }

    const resolvedOld = await resolveAndValidatePathStrict(oldPath);
    const resolvedNew = await resolveAndValidatePathStrict(newPath);

    await fs.rename(resolvedOld, resolvedNew);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof PathSecurityError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Rename failed' }, { status: 500 });
  }
}
