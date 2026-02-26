import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { loadChannels, addChannel, updateChannel, deleteChannel, NotificationError } from '@/lib/notification-utils';
import { logAudit } from '@/lib/audit-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const channels = await loadChannels();
    return NextResponse.json({ channels });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load notifications config' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { name, type, webhookUrl, botToken, chatId, lineToken, events, enabled } = body;
      const channel = await addChannel({ name, type, webhookUrl, botToken, chatId, lineToken, events: events || [], enabled: enabled ?? true });
      await logAudit(req, 'notification_channel_created', 'notification', name, `Created ${type} channel`, 'success');
      return NextResponse.json({ success: true, channel });
    }

    if (action === 'update') {
      const { id, ...updates } = body;
      delete updates.action;
      const channel = await updateChannel(id, updates);
      await logAudit(req, 'notification_channel_updated', 'notification', channel.name, 'Channel updated', 'success');
      return NextResponse.json({ success: true, channel });
    }

    if (action === 'delete') {
      await deleteChannel(body.id);
      await logAudit(req, 'notification_channel_deleted', 'notification', body.id, 'Channel deleted', 'success');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update notifications' }, { status: 500 });
  }
}
