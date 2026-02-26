import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getUFWStatus, FirewallError } from '@/lib/firewall-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const status = await getUFWStatus();
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof FirewallError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to get firewall status' }, { status: 500 });
  }
}
