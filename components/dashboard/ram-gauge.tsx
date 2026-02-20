'use client';

import { useStats } from './stats-provider';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

export default function RamGauge() {
  const { stats } = useStats();
  const usedPercent = stats?.memory.usedPercent ?? 0;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (usedPercent / 100) * circumference;
  const color = usedPercent > 80 ? '#ef4444' : usedPercent > 50 ? '#f59e0b' : '#3b82f6';

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 text-sm font-medium text-zinc-400">Memory Usage</div>
      <div className="flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{usedPercent.toFixed(1)}%</span>
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <div className="text-zinc-400">
            Used: <span className="text-zinc-200">{formatBytes(stats?.memory.used || 0)}</span>
          </div>
          <div className="text-zinc-400">
            Free: <span className="text-zinc-200">{formatBytes(stats?.memory.free || 0)}</span>
          </div>
          <div className="text-zinc-400">
            Total: <span className="text-zinc-200">{formatBytes(stats?.memory.total || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
