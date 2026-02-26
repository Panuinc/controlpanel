import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { renewCertificate } from '@/lib/ssl-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { name } = await req.json();
    const output = await renewCertificate(name);
    await logAudit(req, 'ssl_renewed', 'ssl', name || 'all', 'SSL certificate renewal triggered', 'success');
    return NextResponse.json({ success: true, output });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to renew certificate' }, { status: 500 });
  }
}
