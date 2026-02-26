import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { deleteCronJob, CronError } from '@/lib/cron-utils';
import { logAudit } from '@/lib/audit-utils';

export async function DELETE(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    const jobs = await deleteCronJob(id);
    await logAudit(req, 'cron_deleted', 'cron', id, 'Cron job deleted', 'success');
    return NextResponse.json({ success: true, jobs });
  } catch (err) {
    if (err instanceof CronError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete cron job' }, { status: 500 });
  }
}
