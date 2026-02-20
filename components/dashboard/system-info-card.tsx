'use client';

import { useStats } from './stats-provider';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

export default function SystemInfoCard() {
  const { stats } = useStats();

  const items = [
    { label: 'Hostname', value: stats?.os.hostname },
    { label: 'OS', value: stats ? `${stats.os.distro} ${stats.os.release}` : undefined },
    { label: 'Architecture', value: stats?.os.arch },
    { label: 'Uptime', value: stats ? formatUptime(stats.os.uptime) : undefined },
    { label: 'Processes', value: stats?.processes?.toString() },
    { label: 'Load Average', value: stats?.loadAvg?.map((l) => l.toFixed(2)).join(', ') },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 text-sm font-medium text-zinc-400">System Information</div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">{item.label}</span>
            <span className="text-zinc-200">{item.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
