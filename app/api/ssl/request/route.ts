import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { requestCertificate, SSLError } from '@/lib/ssl-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { domain, email } = await req.json();
    if (!domain || !email) {
      return NextResponse.json({ error: 'Domain and email are required' }, { status: 400 });
    }
    const output = await requestCertificate(domain, email);
    await logAudit(req, 'ssl_requested', 'ssl', domain, 'SSL certificate requested', 'success');
    return NextResponse.json({ success: true, output });
  } catch (err) {
    if (err instanceof SSLError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to request certificate' }, { status: 500 });
  }
}
