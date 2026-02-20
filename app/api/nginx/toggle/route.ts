import { NextRequest, NextResponse } from 'next/server';
import { enableSite, disableSite, reloadNginx, NginxError } from '@/lib/nginx-utils';

export async function POST(req: NextRequest) {
  try {
    const { name, enabled } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Site name required' }, { status: 400 });
    }

    if (enabled) {
      await enableSite(name);
    } else {
      await disableSite(name);
    }

    await reloadNginx();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NginxError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to toggle site' },
      { status: 500 }
    );
  }
}
