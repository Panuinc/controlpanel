import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { loadHistory } from '@/lib/notification-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const history = await loadHistory();
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load notification history' }, { status: 500 });
  }
}
