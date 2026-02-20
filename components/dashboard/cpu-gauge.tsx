'use client';

import { useStats } from './stats-provider';

export default function CpuGauge() {
  const { stats } = useStats();
  const usage = stats?.cpu.usage ?? 0;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (usage / 100) * circumference;
  const color = usage > 80 ? '#ef4444' : usage > 50 ? '#f59e0b' : '#22c55e';

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 text-sm font-medium text-zinc-400">CPU Usage</div>
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
            <span className="text-2xl font-bold text-white">{usage.toFixed(1)}%</span>
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <div className="text-zinc-400">
            Model: <span className="text-zinc-200">{stats?.cpu.model || '—'}</span>
          </div>
          <div className="text-zinc-400">
            Cores: <span className="text-zinc-200">{stats?.cpu.cores || '—'}</span>
          </div>
          <div className="text-zinc-400">
            Speed: <span className="text-zinc-200">{stats?.cpu.speed || '—'} GHz</span>
          </div>
        </div>
      </div>
    </div>
  );
}
