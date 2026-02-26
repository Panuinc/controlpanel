import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { testChannel, NotificationError } from '@/lib/notification-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    await testChannel(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send test notification' }, { status: 500 });
  }
}
