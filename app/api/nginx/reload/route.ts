import { NextResponse } from 'next/server';
import { reloadNginx, NginxError } from '@/lib/nginx-utils';

export async function POST() {
  try {
    await reloadNginx();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NginxError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reload nginx' },
      { status: 500 }
    );
  }
}
