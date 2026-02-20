'use client';

import { useStats } from './stats-provider';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

function formatSpeed(bytes: number): string {
  if (bytes < 1024) return bytes + ' B/s';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB/s';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB/s';
}

export default function NetworkChart() {
  const { stats, history } = useStats();

  const data = history.timestamps.map((t, i) => ({
    time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    rx: history.rxSec[i] || 0,
    tx: history.txSec[i] || 0,
  }));

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-400">Network I/O</div>
        <div className="text-xs text-zinc-500">{stats?.network.iface || ''}</div>
      </div>
      <div className="mb-3 flex gap-4 text-xs">
        <span className="text-emerald-400">↓ RX: {formatSpeed(stats?.network.rxSec || 0)}</span>
        <span className="text-blue-400">↑ TX: {formatSpeed(stats?.network.txSec || 0)}</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#999' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: any, name: any) => [formatSpeed(value ?? 0), name === 'rx' ? 'Download' : 'Upload']) as any}
            />
            <Area type="monotone" dataKey="rx" stroke="#22c55e" fill="url(#rxGrad)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="tx" stroke="#3b82f6" fill="url(#txGrad)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
