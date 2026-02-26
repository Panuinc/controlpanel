import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAuditEntries } from '@/lib/audit-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const category = req.nextUrl.searchParams.get('category') || undefined;
    const username = req.nextUrl.searchParams.get('username') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    const { entries, total } = await getAuditEntries({ category, username, limit, offset });
    return NextResponse.json({ entries, total });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load audit log' }, { status: err instanceof Error && err.message === 'Insufficient permissions' ? 403 : 500 });
  }
}
