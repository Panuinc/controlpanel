import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { fetchTables, DatabaseError } from '@/lib/database-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const connectionId = req.nextUrl.searchParams.get('connectionId');
    if (!connectionId) return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    const tables = await fetchTables(connectionId);
    return NextResponse.json({ tables });
  } catch (err) {
    if (err instanceof DatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch tables' }, { status: 500 });
  }
}
