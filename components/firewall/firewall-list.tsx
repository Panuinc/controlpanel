'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Trash2, ShieldCheck, ShieldOff, X, RefreshCw } from 'lucide-react';

interface FirewallRule {
  number: number;
  to: string;
  action: string;
  from: string;
}

interface FirewallStatus {
  active: boolean;
  rules: FirewallRule[];
}

const PRESETS = [
  { label: 'HTTP', port: '80', protocol: 'tcp' },
  { label: 'HTTPS', port: '443', protocol: 'tcp' },
  { label: 'SSH', port: '22', protocol: 'tcp' },
  { label: 'MySQL', port: '3306', protocol: 'tcp' },
  { label: 'PostgreSQL', port: '5432', protocol: 'tcp' },
];

export default function FirewallList() {
  const [status, setStatus] = useState<FirewallStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/firewall/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load firewall status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleToggle() {
    if (!status) return;
    setToggling(true);
    try {
      const res = await fetch('/api/firewall/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !status.active }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    } finally {
      setToggling(false);
    }
  }

  async function handleDeleteRule(ruleNumber: number) {
    if (!confirm(`Delete rule #${ruleNumber}?`)) return;
    try {
      const res = await fetch('/api/firewall/rule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleNumber }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Firewall (UFW)</h2>
          {status && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                status.active
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-zinc-500/10 text-zinc-400'
              }`}
            >
              {status.active ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
              {status.active ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStatus}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling || !status}
            className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
              status?.active
                ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {toggling ? 'Toggling...' : status?.active ? 'Disable Firewall' : 'Enable Firewall'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Rule</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_100px_1fr_60px] gap-4 border-b border-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <div>#</div>
          <div>To</div>
          <div className="text-center">Action</div>
          <div>From</div>
          <div />
        </div>

        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : status?.rules && status.rules.length > 0 ? (
          <div>
            {status.rules.map((rule) => (
              <div
                key={rule.number}
                className="grid grid-cols-[60px_1fr_100px_1fr_60px] items-center gap-4 border-b border-white/5 px-4 py-2.5 text-sm hover:bg-white/[0.02]"
              >
                <div className="text-zinc-500">{rule.number}</div>
                <div className="font-mono text-xs text-white">{rule.to}</div>
                <div className="text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      rule.action.toUpperCase() === 'ALLOW'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {rule.action}
                  </span>
                </div>
                <div className="font-mono text-xs text-zinc-400">{rule.from}</div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDeleteRule(rule.number)}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">No firewall rules</div>
        )}
      </div>

      <div className="text-xs text-zinc-500">
        {status?.rules?.length ?? 0} rule{status?.rules?.length !== 1 ? 's' : ''}
      </div>

      {showAddModal && (
        <AddRuleModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchStatus();
          }}
        />
      )}
    </div>
  );
}

function AddRuleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [action, setAction] = useState('allow');
  const [port, setPort] = useState('');
  const [protocol, setProtocol] = useState('tcp');
  const [from, setFrom] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!port) {
      setError('Port is required');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/firewall/rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, port, protocol, from: from || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rule');
    } finally {
      setCreating(false);
    }
  }

  function applyPreset(preset: { port: string; protocol: string }) {
    setPort(preset.port);
    setProtocol(preset.protocol);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Add Firewall Rule</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  {p.label} ({p.port})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Port</label>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="80"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Protocol</label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">From IP (optional)</label>
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Anywhere"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
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
            onClick={handleSubmit}
            disabled={creating || !port}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Adding...' : 'Add Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
