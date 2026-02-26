import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { listCronJobs, describeSchedule } from '@/lib/cron-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const jobs = await listCronJobs();
    const enriched = jobs.map((j) => ({ ...j, description: describeSchedule(j) }));
    return NextResponse.json({ jobs: enriched });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list cron jobs' }, { status: 500 });
  }
}
