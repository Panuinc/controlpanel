'use client';

import type { NginxSite } from '@/types/nginx';
import { Lock, FileText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  site: NginxSite;
  onToggle: (name: string, enabled: boolean) => void;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
  onViewLogs: () => void;
}

export default function SiteRow({ site, onToggle, onEdit, onDelete, onViewLogs }: Props) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    await onToggle(site.name, !site.enabled);
    setTimeout(() => setToggling(false), 1500);
  }

  return (
    <div className="grid grid-cols-[1fr_80px_60px_60px_140px] gap-4 items-center px-4 py-2.5 text-sm hover:bg-white/5 border-b border-white/5 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${site.enabled ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
          <span className="truncate text-zinc-200">{site.domain || site.name}</span>
          {site.sslConfigured && <Lock size={11} className="text-emerald-500 shrink-0" />}
        </div>
        <div className="mt-0.5 truncate text-xs text-zinc-500 pl-4">
          {site.proxyPass ? `proxy → ${site.proxyPass}` : site.root ? `root: ${site.root}` : site.name}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition disabled:opacity-50 ${
            site.enabled
              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20'
          }`}
        >
          {site.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="text-center">
        <span className={`text-[10px] font-medium ${site.sslConfigured ? 'text-emerald-400' : 'text-zinc-500'}`}>
          {site.sslConfigured ? 'SSL' : '—'}
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
        <button
          onClick={() => onEdit(site.name)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-blue-500/10 hover:text-blue-400"
          title="Edit config"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete site config "${site.name}"?`)) {
              onDelete(site.name);
            }
          }}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
