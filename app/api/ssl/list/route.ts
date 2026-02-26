import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { listCertificates, SSLError } from '@/lib/ssl-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const certs = await listCertificates();
    return NextResponse.json({ certificates: certs });
  } catch (err) {
    if (err instanceof SSLError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list certificates' }, { status: 500 });
  }
}
