'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProjectConfig } from '@/types/projects';
import ProjectConfigure from './project-configure';
import ProjectDeployLog from './project-deploy-log';
import {
  ArrowLeft,
  Rocket,
  Play,
  Square,
  RotateCcw,
  RefreshCw,
  Settings,
  FileText,
  GitBranch,
  Globe,
  FolderOpen,
  Undo2,
} from 'lucide-react';

type Tab = 'overview' | 'configure' | 'logs';

interface Props {
  projectId: string;
  onBack: () => void;
  onAction: (id: string, action: string) => Promise<void>;
}

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

export default function ProjectDetail({ projectId, onBack, onAction }: Props) {
  const [project, setProject] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [acting, setActing] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/get?id=${projectId}`);
      const data = await res.json();
      if (res.ok) setProject(data.project);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    const interval = setInterval(fetchProject, 5000);
    return () => clearInterval(interval);
  }, [fetchProject]);

  async function handleAction(action: string) {
    if (acting) return;
    setActing(true);
    try {
      await onAction(projectId, action);
      setTimeout(fetchProject, 1000);
    } finally {
      setTimeout(() => setActing(false), 2000);
    }
  }

  async function handleConfigure(updates: Record<string, unknown>) {
    await fetch('/api/projects/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, ...updates }),
    });
    fetchProject();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-white/5" />
        <div className="h-48 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-sm text-zinc-400">
        Project not found.{' '}
        <button onClick={onBack} className="text-blue-400 hover:underline">Go back</button>
      </div>
    );
  }

  if (tab === 'logs') {
    return <ProjectDeployLog projectId={projectId} onClose={() => setTab('overview')} />;
  }

  const isRunning = project.status === 'running';
  const isBuilding = project.status === 'building' || project.status === 'deploying';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(project.status)}`} />
            <h2 className="text-lg font-semibold text-white truncate">{project.name}</h2>
            <span className="text-xs capitalize text-zinc-400">{project.status}</span>
          </div>
        </div>
        <div className="flex gap-1">
          {!isRunning && !isBuilding && (
            <button
              onClick={() => handleAction('deploy')}
              disabled={acting}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Rocket size={13} />
              Deploy
            </button>
          )}
          {isRunning && (
            <>
              <button onClick={() => handleAction('stop')} disabled={acting}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50">
                <Square size={14} />
              </button>
              <button onClick={() => handleAction('restart')} disabled={acting}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-50">
                <RotateCcw size={14} />
              </button>
            </>
          )}
          {!isBuilding && project.lastDeployedAt && (
            <button onClick={() => handleAction('update')} disabled={acting}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-50">
              <RefreshCw size={13} />
              Update
            </button>
          )}
          {project.previousCommit && !isBuilding && (
            <button onClick={() => handleAction('rollback')} disabled={acting}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:text-yellow-400 disabled:opacity-50">
              <Undo2 size={13} />
              Rollback
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1 w-fit">
        {([
          { key: 'overview', label: 'Overview', icon: Globe },
          { key: 'configure', label: 'Configure', icon: Settings },
          { key: 'logs', label: 'Build Logs', icon: FileText },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {project.errorMessage && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {project.errorMessage}
        </div>
      )}

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Project Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5 text-zinc-400"><GitBranch size={13} /> Git URL</span>
                <span className="text-zinc-200 truncate max-w-[200px]">{project.gitUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5 text-zinc-400"><FolderOpen size={13} /> Path</span>
                <span className="text-zinc-200 truncate max-w-[200px]">{project.path}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Framework</span>
                <span className="text-zinc-200 capitalize">{project.framework}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Port</span>
                <span className="text-zinc-200">{project.port || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Domain</span>
                <span className="text-zinc-200">{project.domain || '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Deployment</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Commit</span>
                <span className="font-mono text-xs text-zinc-200">{project.currentCommit || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Previous</span>
                <span className="font-mono text-xs text-zinc-200">{project.previousCommit || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Last Deploy</span>
                <span className="text-zinc-200 text-xs">
                  {project.lastDeployedAt ? new Date(project.lastDeployedAt).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">PM2 Name</span>
                <span className="font-mono text-xs text-zinc-200">{project.pm2Name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Created</span>
                <span className="text-zinc-200 text-xs">{new Date(project.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Commands Card */}
          <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Commands</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-zinc-500">Install</span>
                <p className="font-mono text-xs text-zinc-200 mt-0.5">{project.installCommand || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Build</span>
                <p className="font-mono text-xs text-zinc-200 mt-0.5">{project.buildCommand || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Start</span>
                <p className="font-mono text-xs text-zinc-200 mt-0.5">{project.startCommand || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'configure' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <ProjectConfigure
            project={project}
            onSave={handleConfigure}
            onClose={() => setTab('overview')}
          />
        </div>
      )}
    </div>
  );
}
