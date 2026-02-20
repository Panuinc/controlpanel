'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NginxSite } from '@/types/nginx';
import SiteRow from './site-row';
import SiteEditor from './site-editor';
import SiteCreateDialog from './site-create-dialog';
import SiteLogViewer from './site-log-viewer';
import { Plus, RefreshCw, Search, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react';

type Filter = 'all' | 'enabled' | 'disabled';

export default function SiteList() {
  const [sites, setSites] = useState<NginxSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingSite, setEditingSite] = useState<string | null>(null);
  const [viewingLogs, setViewingLogs] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; output: string } | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/nginx/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSites(data.sites);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  async function handleToggle(name: string, enabled: boolean) {
    try {
      const res = await fetch('/api/nginx/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setTimeout(fetchSites, 500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    }
  }

  async function handleDelete(name: string) {
    try {
      const res = await fetch(`/api/nginx/delete?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchSites();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleTest() {
    try {
      const res = await fetch('/api/nginx/test');
      const data = await res.json();
      setTestResult(data);
      setTimeout(() => setTestResult(null), 5000);
    } catch {
      setTestResult({ valid: false, output: 'Test request failed' });
    }
  }

  async function handleReload() {
    try {
      const res = await fetch('/api/nginx/reload', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setTestResult({ valid: true, output: 'Nginx reloaded successfully' });
      setTimeout(() => setTestResult(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reload failed');
    }
  }

  const filtered = sites.filter((s) => {
    if (filter === 'enabled' && !s.enabled) return false;
    if (filter === 'disabled' && s.enabled) return false;
    const term = search.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.domain.toLowerCase().includes(term);
  });

  if (editingSite) {
    return (
      <SiteEditor
        siteName={editingSite}
        onClose={() => {
          setEditingSite(null);
          fetchSites();
        }}
      />
    );
  }

  if (viewingLogs) {
    return <SiteLogViewer onClose={() => setViewingLogs(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['all', 'enabled', 'disabled'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === f ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
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
              placeholder="Search sites..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleTest}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400 hover:text-white"
            title="Test nginx config"
          >
            Test
          </button>
          <button
            onClick={handleReload}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
            title="Reload nginx"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Site</span>
          </button>
        </div>
      </div>

      {testResult && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs ${
            testResult.valid
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}
        >
          {testResult.valid ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          <span>{testResult.output}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_60px_60px_140px] gap-4 border-b border-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <div>Site</div>
          <div className="text-center">Status</div>
          <div className="text-center">SSL</div>
          <div className="text-center">Logs</div>
          <div className="text-center">Actions</div>
        </div>

        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : (
          <div>
            {filtered.map((site) => (
              <SiteRow
                key={site.name}
                site={site}
                onToggle={handleToggle}
                onEdit={setEditingSite}
                onDelete={handleDelete}
                onViewLogs={() => setViewingLogs(true)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                No sites found
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500">
        {filtered.length} site{filtered.length !== 1 ? 's' : ''}
      </div>

      {showCreate && (
        <SiteCreateDialog
          onCreated={fetchSites}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
