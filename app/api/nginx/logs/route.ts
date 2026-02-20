import { NextRequest, NextResponse } from 'next/server';
import { getNginxLogs } from '@/lib/nginx-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const logType = (req.nextUrl.searchParams.get('type') || 'access') as 'access' | 'error';
    const lines = parseInt(req.nextUrl.searchParams.get('lines') || '100', 10);

    const logs = await getNginxLogs('', logType, lines);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to get nginx logs:', error);
    return NextResponse.json({ error: 'Failed to get logs' }, { status: 500 });
  }
}
