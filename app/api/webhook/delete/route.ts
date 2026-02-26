import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { deleteWebhook, WebhookError } from '@/lib/webhook-utils';
import { logAudit } from '@/lib/audit-utils';

export async function DELETE(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    await deleteWebhook(id);
    await logAudit(req, 'webhook_deleted', 'webhook', id, 'Webhook deleted', 'success');
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof WebhookError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete webhook' }, { status: 500 });
  }
}
