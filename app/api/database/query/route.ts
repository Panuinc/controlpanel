import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { executeSQL, DatabaseError } from '@/lib/database-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { connectionId, sql } = await req.json();

    if (!connectionId || !sql) {
      return NextResponse.json({ error: 'Connection ID and SQL are required' }, { status: 400 });
    }

    const result = await executeSQL(connectionId, sql);
    await logAudit(req, 'sql_executed', 'database', connectionId, `SQL: ${sql.substring(0, 100)}`, result.error ? 'failure' : 'success');
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to execute query' }, { status: 500 });
  }
}
