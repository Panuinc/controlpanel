'use client';

import { useStats } from './stats-provider';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

export default function DiskUsage() {
  const { stats } = useStats();
  const disks = stats?.disk || [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 text-sm font-medium text-zinc-400">Disk Usage</div>
      <div className="space-y-4">
        {disks.map((disk) => {
          const color = disk.usedPercent > 90 ? 'bg-red-500' : disk.usedPercent > 70 ? 'bg-yellow-500' : 'bg-emerald-500';
          return (
            <div key={disk.mount}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-zinc-300">{disk.mount}</span>
                <span className="text-zinc-400">
                  {formatBytes(disk.used)} / {formatBytes(disk.size)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${Math.min(disk.usedPercent, 100)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {disk.usedPercent.toFixed(1)}% used — {formatBytes(disk.available)} free
              </div>
            </div>
          );
        })}
        {disks.length === 0 && <div className="text-sm text-zinc-500">No disk information</div>}
      </div>
    </div>
  );
}
