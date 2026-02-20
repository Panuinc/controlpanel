'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProjectConfig, ProjectStatus } from '@/types/projects';
import ProjectCard from './project-card';
import ProjectCreateDialog from './project-create-dialog';
import ProjectDetail from './project-detail';
import { Plus, RefreshCw, Search } from 'lucide-react';

type Filter = 'all' | ProjectStatus;

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?filter=${filter}` : '';
      const res = await fetch(`/api/projects/list${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProjects(data.projects);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleAction(id: string, action: string) {
    try {
      const res = await fetch('/api/projects/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setTimeout(fetchProjects, 1000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.domain.toLowerCase().includes(search.toLowerCase()) ||
      p.gitUrl.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedProject) {
    return (
      <ProjectDetail
        projectId={selectedProject}
        onBack={() => {
          setSelectedProject(null);
          fetchProjects();
        }}
        onAction={async (id, action) => {
          await handleAction(id, action);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['all', 'running', 'stopped', 'error'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === f
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={fetchProjects}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Project</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 py-16">
          <p className="text-sm text-zinc-500">
            {projects.length === 0 ? 'No projects yet' : 'No matching projects'}
          </p>
          {projects.length === 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onAction={handleAction}
              onClick={() => setSelectedProject(project.id)}
            />
          ))}
        </div>
      )}

      <div className="text-xs text-zinc-500">
        {filtered.length} project{filtered.length !== 1 ? 's' : ''}
      </div>

      {showCreate && (
        <ProjectCreateDialog
          onCreated={fetchProjects}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
