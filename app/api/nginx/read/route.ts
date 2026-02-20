import { NextRequest, NextResponse } from 'next/server';
import { readNginxConfig, NginxError } from '@/lib/nginx-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: 'Site name required' }, { status: 400 });
    }

    const content = await readNginxConfig(name);
    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof NginxError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }
}
