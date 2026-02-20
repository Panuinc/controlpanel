import { NextRequest, NextResponse } from 'next/server';
import { deleteNginxConfig, reloadNginx, NginxError } from '@/lib/nginx-utils';

export async function DELETE(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: 'Site name required' }, { status: 400 });
    }

    await deleteNginxConfig(name);
    await reloadNginx().catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NginxError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete config' },
      { status: 500 }
    );
  }
}
