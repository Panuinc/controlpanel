import { NextResponse } from 'next/server';
import si from 'systeminformation';
import type { SystemStats } from '@/types/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [cpu, currentLoad, mem, disk, net, osInfo, processes] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.osInfo(),
      si.processes(),
    ]);

    const primaryNet = net.find((n) => n.iface !== 'lo') || net[0];

    const stats: SystemStats = {
      cpu: {
        usage: Math.round(currentLoad.currentLoad * 100) / 100,
        cores: cpu.cores,
        model: cpu.brand,
        speed: cpu.speed,
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usedPercent: Math.round((mem.used / mem.total) * 10000) / 100,
      },
      disk: disk
        .filter((d) => !d.fs.startsWith('tmpfs') && !d.fs.startsWith('devtmpfs'))
        .map((d) => ({
          fs: d.fs,
          mount: d.mount,
          size: d.size,
          used: d.used,
          available: d.available,
          usedPercent: Math.round(d.use * 100) / 100,
        })),
      network: {
        iface: primaryNet?.iface || 'N/A',
        rxSec: Math.round(primaryNet?.rx_sec || 0),
        txSec: Math.round(primaryNet?.tx_sec || 0),
        rxTotal: primaryNet?.rx_bytes || 0,
        txTotal: primaryNet?.tx_bytes || 0,
      },
      os: {
        hostname: osInfo.hostname,
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        uptime: si.time().uptime,
        arch: osInfo.arch,
      },
      loadAvg: currentLoad.avgLoad !== undefined
        ? [currentLoad.avgLoad]
        : [],
      processes: processes.all,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get system stats:', error);
    return NextResponse.json({ error: 'Failed to get system stats' }, { status: 500 });
  }
}
