import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { addRule, deleteRule, FirewallError } from '@/lib/firewall-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { action, port, protocol, from } = await req.json();
    const result = await addRule(action, port, protocol, from);
    await logAudit(req, 'firewall_rule_added', 'firewall', port, `${action} ${port} ${protocol || ''} ${from || ''}`.trim(), 'success');
    return NextResponse.json({ success: true, output: result });
  } catch (err) {
    if (err instanceof FirewallError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to add rule' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { ruleNumber } = await req.json();
    const result = await deleteRule(ruleNumber);
    await logAudit(req, 'firewall_rule_deleted', 'firewall', String(ruleNumber), 'Firewall rule deleted', 'success');
    return NextResponse.json({ success: true, output: result });
  } catch (err) {
    if (err instanceof FirewallError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete rule' }, { status: 500 });
  }
}
