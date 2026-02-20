'use client';

import { useState } from 'react';
import { X, FolderOpen, Loader2, KeyRound } from 'lucide-react';

interface Props {
  onImported: () => void;
  onClose: () => void;
}

export default function ProjectImportDialog({ onImported, onClose }: Props) {
  const [projectPath, setProjectPath] = useState('');
  const [name, setName] = useState('');
  const [gitUsername, setGitUsername] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function autoName(p: string) {
    const parts = p.replace(/\/$/, '').split('/');
    const last = parts[parts.length - 1];
    if (last && !name) {
      setName(last);
    }
  }

  async function handleImport() {
    if (!projectPath || !name) {
      setError('Project path and name are required');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: projectPath,
          name,
          gitUsername: gitUsername || undefined,
          gitToken: gitToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import');

      onImported();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import project');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Import Existing Project</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Project Path on Server</label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => {
                setProjectPath(e.target.value);
                autoName(e.target.value);
              }}
              placeholder="/var/www/my-project"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              disabled={importing}
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
              disabled={importing}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
            >
              <KeyRound size={13} />
              {showCredentials ? 'Hide' : 'Add'} Git Credentials (for private repos)
            </button>
          </div>

          {showCredentials && (
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Git Username</label>
                <input
                  type="text"
                  value={gitUsername}
                  onChange={(e) => setGitUsername(e.target.value)}
                  placeholder="username"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Personal Access Token</label>
                <input
                  type="password"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-[10px] text-zinc-600">
                  Token จะถูกเก็บไว้เพื่อใช้ตอน git pull ไม่ต้องกรอกซ้ำ
                </p>
              </div>
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
            disabled={importing}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !projectPath || !name}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {importing ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Importing...
              </span>
            ) : (
              'Import Project'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
