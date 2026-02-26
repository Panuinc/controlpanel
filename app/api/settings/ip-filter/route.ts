import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { loadIPFilter, saveIPFilter, addIPRule, removeIPRule } from '@/lib/ip-filter-utils';
import { logAudit } from '@/lib/audit-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const config = await loadIPFilter();
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load IP filter' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const body = await req.json();
    const { action } = body;

    if (action === 'toggle') {
      const config = await loadIPFilter();
      config.enabled = body.enabled ?? !config.enabled;
      await saveIPFilter(config);
      await logAudit(req, `ip_filter_${config.enabled ? 'enabled' : 'disabled'}`, 'system', 'ip-filter', `IP filter ${config.enabled ? 'enabled' : 'disabled'}`, 'success');
      return NextResponse.json(config);
    }

    if (action === 'setMode') {
      const config = await loadIPFilter();
      config.mode = body.mode;
      await saveIPFilter(config);
      await logAudit(req, 'ip_filter_mode_changed', 'system', 'ip-filter', `Mode set to ${body.mode}`, 'success');
      return NextResponse.json(config);
    }

    if (action === 'add') {
      const config = await addIPRule(body.ip, body.description || '');
      await logAudit(req, 'ip_rule_added', 'system', body.ip, `Added IP rule: ${body.ip}`, 'success');
      return NextResponse.json(config);
    }

    if (action === 'remove') {
      const config = await removeIPRule(body.ip);
      await logAudit(req, 'ip_rule_removed', 'system', body.ip, `Removed IP rule: ${body.ip}`, 'success');
      return NextResponse.json(config);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update IP filter' }, { status: 500 });
  }
}
