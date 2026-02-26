import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { listContainers, getContainerStats, DockerError } from '@/lib/docker-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'deployer']);
    const withStats = req.nextUrl.searchParams.get('stats') === 'true';
    const containers = await listContainers();

    if (withStats) {
      try {
        const stats = await getContainerStats();
        const statsMap = new Map(stats.map((s) => [s.id, s]));
        const enriched = containers.map((c) => {
          const stat = statsMap.get(c.id);
          if (!stat) return { ...c, stats: null };
          const cpuPercent = parseFloat(String(stat.cpuPercent).replace('%', '')) || 0;
          const memParts = String(stat.memUsage).split(' / ');
          const netParts = String(stat.netIO).split(' / ');
          return {
            ...c,
            stats: {
              cpuPercent,
              memoryUsage: memParts[0] || '0B',
              memoryLimit: memParts[1] || '0B',
              networkIn: netParts[0] || '0B',
              networkOut: netParts[1] || '0B',
            },
          };
        });
        return NextResponse.json({ containers: enriched });
      } catch {
        return NextResponse.json({ containers });
      }
    }

    return NextResponse.json({ containers });
  } catch (err) {
    if (err instanceof DockerError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list containers' }, { status: 500 });
  }
}
