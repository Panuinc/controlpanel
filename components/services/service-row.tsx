'use client';

import type { ServiceInfo } from '@/types/services';
import { Play, Square, RotateCcw, FileText } from 'lucide-react';
import { useState } from 'react';

function getStatusColor(state: string): string {
  switch (state) {
    case 'active': return 'bg-emerald-500';
    case 'inactive': return 'bg-zinc-500';
    case 'failed': return 'bg-red-500';
    case 'activating': return 'bg-yellow-500';
    case 'deactivating': return 'bg-yellow-500';
    default: return 'bg-zinc-500';
  }
}

function getSubStateLabel(sub: string): string {
  switch (sub) {
    case 'running': return 'text-emerald-400';
    case 'dead': return 'text-zinc-500';
    case 'failed': return 'text-red-400';
    case 'exited': return 'text-zinc-400';
    default: return 'text-zinc-400';
  }
}

interface Props {
  service: ServiceInfo;
  onAction: (name: string, action: string) => void;
  onViewLogs: () => void;
}

export default function ServiceRow({ service, onAction, onViewLogs }: Props) {
  const [acting, setActing] = useState(false);

  async function handleAction(action: string) {
    if (acting) return;
    setActing(true);
    await onAction(service.name, action);
    setTimeout(() => setActing(false), 2000);
  }

  const isRunning = service.subState === 'running';

  return (
    <div className="grid grid-cols-[1fr_80px_80px_80px_120px] gap-4 items-center px-4 py-2.5 text-sm hover:bg-white/5 border-b border-white/5 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${getStatusColor(service.activeState)}`} />
          <span className="truncate text-zinc-200">{service.name}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-zinc-500 pl-4">{service.description}</div>
      </div>

      <div className="text-center">
        <span className={`text-xs font-medium ${getSubStateLabel(service.activeState)}`}>
          {service.activeState}
        </span>
      </div>

      <div className="text-center">
        <span className={`text-xs ${getSubStateLabel(service.subState)}`}>
          {service.subState}
        </span>
      </div>

      <div className="text-center">
        <button
          onClick={onViewLogs}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
          title="View logs"
        >
          <FileText size={14} />
        </button>
      </div>

      <div className="flex justify-center gap-1">
        {!isRunning && (
          <button
            onClick={() => handleAction('start')}
            disabled={acting}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-30"
            title="Start"
          >
            <Play size={14} />
          </button>
        )}
        {isRunning && (
          <button
            onClick={() => handleAction('stop')}
            disabled={acting}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
            title="Stop"
          >
            <Square size={14} />
          </button>
        )}
        <button
          onClick={() => handleAction('restart')}
          disabled={acting}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-30"
          title="Restart"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
