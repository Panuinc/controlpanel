import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createWebhook, WebhookError } from '@/lib/webhook-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const { projectId, branch } = await req.json();
    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    const webhook = await createWebhook(projectId, branch || 'main');
    await logAudit(req, 'webhook_created', 'webhook', projectId, `Webhook created for branch: ${branch || 'main'}`, 'success');
    return NextResponse.json({ success: true, webhook });
  } catch (err) {
    if (err instanceof WebhookError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create webhook' }, { status: 500 });
  }
}
