'use client';

import { useState } from 'react';
import { X, GitBranch, Loader2 } from 'lucide-react';

interface Props {
  onCreated: () => void;
  onClose: () => void;
}

export default function ProjectCreateDialog({ onCreated, onClose }: Props) {
  const [gitUrl, setGitUrl] = useState('');
  const [name, setName] = useState('');
  const [targetDir, setTargetDir] = useState('/var/www');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneOutput, setCloneOutput] = useState('');

  function autoName(url: string) {
    const match = url.match(/\/([^\/]+?)(\.git)?$/);
    if (match && !name) {
      setName(match[1]);
    }
  }

  async function handleCreate() {
    if (!gitUrl || !name) {
      setError('Git URL and project name are required');
      return;
    }

    setCreating(true);
    setError(null);
    setCloneOutput('Cloning repository...');

    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gitUrl, name, targetDir }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      setCloneOutput('Project created successfully!');
      setTimeout(() => {
        onCreated();
        onClose();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setCloneOutput('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">New Project</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Git Repository URL</label>
            <input
              type="text"
              value={gitUrl}
              onChange={(e) => {
                setGitUrl(e.target.value);
                autoName(e.target.value);
              }}
              placeholder="https://github.com/user/repo.git"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              disabled={creating}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              disabled={creating}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Target Directory</label>
            <input
              type="text"
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              placeholder="/var/www"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              disabled={creating}
            />
            <p className="mt-1 text-[11px] text-zinc-600">
              Project will be cloned to {targetDir}/{name || 'project-name'}
            </p>
          </div>

          {cloneOutput && (
            <div className="rounded-lg bg-white/5 px-3 py-2 text-xs font-mono text-zinc-300">
              {creating && <Loader2 size={12} className="mr-1.5 inline animate-spin" />}
              {cloneOutput}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            onClick={onClose}
            disabled={creating}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !gitUrl || !name}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Cloning...' : 'Clone & Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
