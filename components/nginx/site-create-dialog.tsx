'use client';

import { useState } from 'react';
import { X, Globe } from 'lucide-react';
import type { NginxSiteType } from '@/types/nginx';

interface Props {
  onCreated: () => void;
  onClose: () => void;
}

export default function SiteCreateDialog({ onCreated, onClose }: Props) {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState<NginxSiteType>('proxy');
  const [proxyPort, setProxyPort] = useState('3000');
  const [rootPath, setRootPath] = useState('/var/www');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!domain) {
      setError('Domain is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Create config
      const res = await fetch('/api/nginx/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: domain,
          domain,
          type,
          proxyPort: type === 'proxy' ? parseInt(proxyPort, 10) : undefined,
          rootPath: type !== 'proxy' ? rootPath : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      // Enable site
      await fetch('/api/nginx/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: domain, enabled: true }),
      });

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">New Site</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Type</label>
            <div className="flex gap-2">
              {(['proxy', 'static', 'php'] as NginxSiteType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-4 py-2 text-xs font-medium capitalize transition ${
                    type === t
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {t === 'proxy' ? 'Reverse Proxy' : t === 'static' ? 'Static Files' : 'PHP'}
                </button>
              ))}
            </div>
          </div>

          {type === 'proxy' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Proxy Port</label>
              <input
                type="number"
                value={proxyPort}
                onChange={(e) => setProxyPort(e.target.value)}
                placeholder="3000"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
            </div>
          )}

          {type !== 'proxy' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Root Path</label>
              <input
                type="text"
                value={rootPath}
                onChange={(e) => setRootPath(e.target.value)}
                placeholder="/var/www/html"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
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
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !domain}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Site'}
          </button>
        </div>
      </div>
    </div>
  );
}
