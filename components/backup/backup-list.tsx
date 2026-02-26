'use client';

import { useState, useEffect, useCallback } from 'react';
import { Archive, Plus, Download, RotateCcw, Trash2, RefreshCw, X } from 'lucide-react';

interface Backup {
  id: string;
  projectName: string;
  filename: string;
  size: number;
  date: string;
  commitHash?: string;
}

interface Project {
  id: string;
  name: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function BackupList() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBackups(data.backups ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProjects(data.projects ?? []);
    } catch {
      // Projects fetch is secondary, don't block UI
    }
  }, []);

  useEffect(() => {
    fetchBackups();
    fetchProjects();
  }, [fetchBackups, fetchProjects]);

  async function handleRestore(backupId: string) {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite the current project files.')) return;
    setRestoringId(backupId);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      alert('Backup restored successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoringId(null);
    }
  }

  function handleDownload(id: string) {
    window.open(`/api/backup/download?id=${encodeURIComponent(id)}`, '_blank');
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this backup permanently?')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/backup/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchBackups();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Archive size={20} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Backups</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchBackups}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Create Backup</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_80px_120px_100px_140px] gap-4 border-b border-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <div>Project</div>
          <div>Filename</div>
          <div className="text-right">Size</div>
          <div>Date</div>
          <div>Commit</div>
          <div className="text-center">Actions</div>
        </div>

        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12">
            <Archive size={32} className="mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-500">No backups found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Create your first backup
            </button>
          </div>
        ) : (
          <div>
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="grid grid-cols-[1fr_1fr_80px_120px_100px_140px] items-center gap-4 border-b border-white/5 px-4 py-2.5 text-sm hover:bg-white/[0.02]"
              >
                <div className="truncate text-white">{backup.projectName}</div>
                <div className="truncate font-mono text-xs text-zinc-400">{backup.filename}</div>
                <div className="text-right text-xs text-zinc-400">{formatSize(backup.size)}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(backup.date).toLocaleDateString()}{' '}
                  {new Date(backup.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="truncate font-mono text-xs text-zinc-600">
                  {backup.commitHash ? backup.commitHash.slice(0, 7) : '-'}
                </div>
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => handleDownload(backup.id)}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                    title="Download"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={() => handleRestore(backup.id)}
                    disabled={restoringId === backup.id}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-50"
                    title="Restore"
                  >
                    <RotateCcw size={13} className={restoringId === backup.id ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => handleDelete(backup.id)}
                    disabled={deletingId === backup.id}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500">
        {backups.length} backup{backups.length !== 1 ? 's' : ''}
        {backups.length > 0 && (
          <span className="ml-2">
            (Total: {formatSize(backups.reduce((sum, b) => sum + b.size, 0))})
          </span>
        )}
      </div>

      {showCreateModal && (
        <CreateBackupModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchBackups();
          }}
        />
      )}
    </div>
  );
}

function CreateBackupModal({
  projects,
  onClose,
  onCreated,
}: {
  projects: Project[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!projectId) {
      setError('Please select a project');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Archive size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Create Backup</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !projectId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
