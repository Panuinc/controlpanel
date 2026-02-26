import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { getDashboardConfig, saveDashboardConfig } from '@/lib/dashboard-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const config = await getDashboardConfig(user.userId);
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load config' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const updates = await req.json();
    const config = await saveDashboardConfig(user.userId, updates);
    return NextResponse.json({ success: true, config });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save config' }, { status: 500 });
  }
}
