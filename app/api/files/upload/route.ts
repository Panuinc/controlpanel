import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { resolveAndValidatePathStrict, PathSecurityError } from '@/lib/file-utils';

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const targetDir = formData.get('targetDir') as string || '/';
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const resolvedDir = await resolveAndValidatePathStrict(targetDir);
    const uploaded: string[] = [];

    for (const file of files) {
      if (file.size > MAX_UPLOAD_SIZE) {
        return NextResponse.json({ error: `File ${file.name} too large (max 100MB)` }, { status: 413 });
      }

      const targetPath = path.join(resolvedDir, file.name);
      if (!targetPath.startsWith(resolvedDir)) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(targetPath, buffer);
      uploaded.push(file.name);
    }

    return NextResponse.json({ success: true, files: uploaded });
  } catch (err) {
    if (err instanceof PathSecurityError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
