import { NextRequest, NextResponse } from 'next/server';
import { getServiceLogs, ValidationError } from '@/lib/exec-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  const lines = parseInt(req.nextUrl.searchParams.get('lines') || '100', 10);

  if (!name) {
    return NextResponse.json({ error: 'Service name required' }, { status: 400 });
  }

  try {
    const logs = await getServiceLogs(name, lines);
    return NextResponse.json({ logs, name });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to get logs' }, { status: 500 });
  }
}
