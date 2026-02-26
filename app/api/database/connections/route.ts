import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getConnections, addConnection, deleteConnection, DatabaseError } from '@/lib/database-utils';
import { logAudit } from '@/lib/audit-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const connections = await getConnections();
    return NextResponse.json({ connections });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list connections' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { name, projectUrl, anonKey, serviceRoleKey } = await req.json();
    const conn = await addConnection(name, projectUrl, anonKey, serviceRoleKey);
    await logAudit(req, 'database_connection_added', 'database', name, `Added Supabase connection: ${projectUrl}`, 'success');
    return NextResponse.json({ success: true, connection: conn });
  } catch (err) {
    if (err instanceof DatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to add connection' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    await deleteConnection(id);
    await logAudit(req, 'database_connection_deleted', 'database', id, 'Database connection removed', 'success');
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof DatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete connection' }, { status: 500 });
  }
}
