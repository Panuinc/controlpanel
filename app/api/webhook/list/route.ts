import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getWebhooksByProject, loadWebhooks } from '@/lib/webhook-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const projectId = req.nextUrl.searchParams.get('projectId');
    const webhooks = projectId ? await getWebhooksByProject(projectId) : await loadWebhooks();
    return NextResponse.json({ webhooks });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list webhooks' }, { status: 500 });
  }
}
