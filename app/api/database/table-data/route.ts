import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { queryTable, DatabaseError } from '@/lib/database-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const connectionId = req.nextUrl.searchParams.get('connectionId');
    const table = req.nextUrl.searchParams.get('table');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    if (!connectionId || !table) {
      return NextResponse.json({ error: 'Connection ID and table name are required' }, { status: 400 });
    }

    const result = await queryTable(connectionId, table, limit, offset);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to query table' }, { status: 500 });
  }
}
