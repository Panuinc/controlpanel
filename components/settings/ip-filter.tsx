'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Trash2, Globe } from 'lucide-react';

interface IpRule {
  ip: string;
  description: string;
  createdAt: string;
}

interface IpFilterState {
  enabled: boolean;
  mode: 'whitelist' | 'blacklist';
  rules: IpRule[];
}

export default function IpFilter() {
  const [data, setData] = useState<IpFilterState>({ enabled: false, mode: 'whitelist', rules: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newIp, setNewIp] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchFilter = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/ip-filter');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData({ enabled: json.enabled, mode: json.mode, rules: json.rules });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load IP filter settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilter();
  }, [fetchFilter]);

  async function postAction(body: Record<string, unknown>) {
    const res = await fetch('/api/settings/ip-filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json;
  }

  async function handleToggle() {
    const next = !data.enabled;
    setData((d) => ({ ...d, enabled: next }));
    try {
      await postAction({ action: 'toggle', enabled: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
      setData((d) => ({ ...d, enabled: !next }));
    }
  }

  async function handleMode(mode: 'whitelist' | 'blacklist') {
    const prev = data.mode;
    setData((d) => ({ ...d, mode }));
    try {
      await postAction({ action: 'setMode', mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mode change failed');
      setData((d) => ({ ...d, mode: prev }));
    }
  }

  async function handleAdd() {
    if (!newIp.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await postAction({ action: 'add', ip: newIp.trim(), description: newDesc.trim() });
      setNewIp('');
      setNewDesc('');
      fetchFilter();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rule');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(ip: string) {
    try {
      await postAction({ action: 'remove', ip });
      setData((d) => ({ ...d, rules: d.rules.filter((r) => r.ip !== ip) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove rule');
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="space-y-3">
          <div className="h-5 w-48 animate-pulse rounded bg-white/5" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="mb-5 flex items-center gap-3">
          <Globe size={20} className="text-blue-400" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">IP Filter</h3>
            <p className="text-xs text-zinc-400">Restrict access by IP address or CIDR range.</p>
          </div>
          {/* Toggle Switch */}
          <button
            onClick={handleToggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              data.enabled ? 'bg-blue-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                data.enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Mode Selector */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-medium text-zinc-400">Mode</label>
          <div className="flex gap-3">
            {(['whitelist', 'blacklist'] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="ipMode"
                  checked={data.mode === m}
                  onChange={() => handleMode(m)}
                  className="h-4 w-4 border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm capitalize text-zinc-300">{m}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {data.mode === 'whitelist'
              ? 'Only listed IPs will be allowed access.'
              : 'Listed IPs will be blocked from access.'}
          </p>
        </div>

        {/* Add Rule */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-medium text-zinc-400">Add Rule</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="IP or CIDR (e.g. 192.168.1.0/24)"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newIp.trim()}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={16} />
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Rules Table */}
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_100px_50px] gap-4 border-b border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <div>IP / CIDR</div>
            <div>Description</div>
            <div>Created</div>
            <div className="text-center">Del</div>
          </div>
          {data.rules.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">No rules configured</div>
          ) : (
            <div className="divide-y divide-white/5">
              {data.rules.map((rule) => (
                <div
                  key={rule.ip}
                  className="grid grid-cols-[1fr_1fr_100px_50px] items-center gap-4 px-4 py-2.5 text-sm hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2 font-mono text-xs text-white">
                    <Shield size={12} className="shrink-0 text-zinc-500" />
                    {rule.ip}
                  </div>
                  <div className="truncate text-xs text-zinc-400">{rule.description || '--'}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(rule.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleRemove(rule.ip)}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                      title="Remove rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-zinc-500">
          {data.rules.length} rule{data.rules.length !== 1 ? 's' : ''} configured
        </div>
      </div>
    </div>
  );
}
