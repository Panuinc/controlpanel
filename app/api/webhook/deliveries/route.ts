import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { loadDeliveries } from '@/lib/webhook-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const webhookId = req.nextUrl.searchParams.get('webhookId') || undefined;
    const deliveries = await loadDeliveries(webhookId);
    return NextResponse.json({ deliveries: deliveries.slice(0, 50) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load deliveries' }, { status: 500 });
  }
}
