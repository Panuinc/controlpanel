'use client';

import type { ProjectConfig } from '@/types/projects';
import { Play, Square, RotateCcw, Rocket, Trash2, ExternalLink, GitBranch } from 'lucide-react';
import { useState } from 'react';

function getStatusColor(status: string): string {
  switch (status) {
    case 'running': return 'bg-emerald-500';
    case 'stopped': return 'bg-zinc-500';
    case 'building':
    case 'deploying': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-zinc-500';
  }
}

function getStatusTextColor(status: string): string {
  switch (status) {
    case 'running': return 'text-emerald-400';
    case 'stopped': return 'text-zinc-400';
    case 'building':
    case 'deploying': return 'text-yellow-400';
    case 'error': return 'text-red-400';
    default: return 'text-zinc-400';
  }
}

function getFrameworkLabel(framework: string): string {
  switch (framework) {
    case 'nodejs': return 'Node.js';
    case 'static': return 'Static';
    case 'python': return 'Python';
    case 'php': return 'PHP';
    default: return 'Unknown';
  }
}

function getFrameworkColor(framework: string): string {
  switch (framework) {
    case 'nodejs': return 'border-green-500/30 text-green-400 bg-green-500/10';
    case 'static': return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
    case 'python': return 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10';
    case 'php': return 'border-purple-500/30 text-purple-400 bg-purple-500/10';
    default: return 'border-zinc-500/30 text-zinc-400 bg-zinc-500/10';
  }
}

interface Props {
  project: ProjectConfig;
  onAction: (id: string, action: string) => void;
  onClick: () => void;
}

export default function ProjectCard({ project, onAction, onClick }: Props) {
  const [acting, setActing] = useState(false);

  async function handleAction(e: React.MouseEvent, action: string) {
    e.stopPropagation();
    if (acting) return;
    setActing(true);
    await onAction(project.id, action);
    setTimeout(() => setActing(false), 3000);
  }

  const isRunning = project.status === 'running';
  const isBuilding = project.status === 'building' || project.status === 'deploying';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(project.status)}`} />
            <h3 className="truncate text-sm font-medium text-white">{project.name}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getFrameworkColor(project.framework)}`}>
              {getFrameworkLabel(project.framework)}
            </span>
          </div>
          {project.domain && (
            <div className="mt-1.5 flex items-center gap-1.5 pl-[18px]">
              <ExternalLink size={11} className="text-zinc-500" />
              <span className="text-xs text-zinc-400">{project.domain}</span>
            </div>
          )}
          <div className="mt-1 flex items-center gap-1.5 pl-[18px]">
            <GitBranch size={11} className="text-zinc-500" />
            <span className="text-xs text-zinc-500 truncate">{project.currentCommit || '—'}</span>
          </div>
        </div>

        <span className={`text-xs font-medium capitalize ${getStatusTextColor(project.status)}`}>
          {project.status}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-500">
        {project.port > 0 && <span>:{project.port}</span>}
        <span className="truncate">{project.path}</span>
      </div>

      {project.lastDeployedAt && (
        <div className="mt-1 text-[11px] text-zinc-600">
          Deployed {new Date(project.lastDeployedAt).toLocaleString()}
        </div>
      )}

      {project.errorMessage && (
        <div className="mt-2 truncate rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-400">
          {project.errorMessage}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-white/5 pt-3">
        {!isRunning && !isBuilding && (
          <button
            onClick={(e) => handleAction(e, 'deploy')}
            disabled={acting}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-30"
            title="Deploy"
          >
            <Rocket size={12} />
            <span>Deploy</span>
          </button>
        )}
        {!isRunning && !isBuilding && project.lastDeployedAt && (
          <button
            onClick={(e) => handleAction(e, 'start')}
            disabled={acting}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-30"
            title="Start"
          >
            <Play size={12} />
          </button>
        )}
        {isRunning && (
          <>
            <button
              onClick={(e) => handleAction(e, 'stop')}
              disabled={acting}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
              title="Stop"
            >
              <Square size={12} />
            </button>
            <button
              onClick={(e) => handleAction(e, 'restart')}
              disabled={acting}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-30"
              title="Restart"
            >
              <RotateCcw size={12} />
            </button>
          </>
        )}
        {isBuilding && (
          <span className="flex items-center gap-1 text-xs text-yellow-400">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
            Building...
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete project "${project.name}"? This will remove all files.`)) {
              onAction(project.id, 'delete');
            }
          }}
          className="rounded-md p-1.5 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
