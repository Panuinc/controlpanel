import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { toggleFirewall } from '@/lib/firewall-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { enable } = await req.json();
    const result = await toggleFirewall(enable);
    await logAudit(req, `firewall_${enable ? 'enabled' : 'disabled'}`, 'firewall', 'ufw', `Firewall ${enable ? 'enabled' : 'disabled'}`, 'success');
    return NextResponse.json({ success: true, output: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to toggle firewall' }, { status: 500 });
  }
}
