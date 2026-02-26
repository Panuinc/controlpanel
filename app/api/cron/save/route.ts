import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { addCronJob, CronError } from '@/lib/cron-utils';
import { logAudit } from '@/lib/audit-utils';

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);
    const { minute, hour, dayOfMonth, month, dayOfWeek, command, comment } = await req.json();
    const jobs = await addCronJob({ minute, hour, dayOfMonth, month, dayOfWeek, command, comment: comment || '' });
    await logAudit(req, 'cron_created', 'cron', command, `Created cron: ${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`, 'success');
    return NextResponse.json({ success: true, jobs });
  } catch (err) {
    if (err instanceof CronError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save cron job' }, { status: 500 });
  }
}
