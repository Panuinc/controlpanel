import { NextResponse } from 'next/server';
import { listNginxSites } from '@/lib/nginx-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sites = await listNginxSites();
    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Failed to list nginx sites:', error);
    return NextResponse.json({ error: 'Failed to list sites' }, { status: 500 });
  }
}
