'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link, Plus, Trash2, Copy, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

interface Webhook {
  id: string;
  token: string;
  secret: string;
  branch: string;
  enabled: boolean;
  createdAt: string;
}

interface Delivery {
  id: string;
  timestamp: string;
  source: 'github' | 'gitlab' | 'unknown';
  event: string;
  status: 'success' | 'failure' | 'skipped';
  details: string;
}

interface Props {
  projectId: string;
}

export default function WebhookManager({ projectId }: Props) {
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState('main');
  const [creating, setCreating] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchWebhook = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/webhook/list?projectId=${projectId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWebhook(data.webhook || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhook');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchDeliveries = useCallback(async (webhookId: string) => {
    try {
      const res = await fetch(`/api/webhook/deliveries?webhookId=${webhookId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeliveries(data.deliveries);
    } catch {
      /* deliveries are non-critical */
    }
  }, []);

  useEffect(() => {
    fetchWebhook();
  }, [fetchWebhook]);

  useEffect(() => {
    if (webhook) fetchDeliveries(webhook.id);
  }, [webhook, fetchDeliveries]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/webhook/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, branch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchWebhook();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!webhook || !confirm('Delete this webhook?')) return;
    try {
      const res = await fetch('/api/webhook/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: webhook.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setWebhook(null);
      setDeliveries([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function handleCopyUrl() {
    if (!webhook) return;
    const url = `${window.location.origin}/api/webhook/incoming/${webhook.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getSourceBadge(source: string) {
    switch (source) {
      case 'github':
        return 'bg-zinc-800 text-zinc-300';
      case 'gitlab':
        return 'bg-orange-500/10 text-orange-400';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'success':
        return 'text-emerald-400';
      case 'failure':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link size={16} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Webhook</h3>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!webhook ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="mb-4 text-sm text-zinc-400">No webhook configured for this project.</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={14} />
              {creating ? 'Creating...' : 'Create Webhook'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Webhook Details */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/incoming/${webhook.token}`}
                  </code>
                  <button
                    onClick={handleCopyUrl}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                    title="Copy URL"
                  >
                    {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Secret</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                    {showSecret ? webhook.secret : '••••••••••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                    title={showSecret ? 'Hide' : 'Show'}
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1 text-xs">
                <div>
                  <span className="text-zinc-500">Branch: </span>
                  <span className="text-zinc-300">{webhook.branch}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Status: </span>
                  <span className={webhook.enabled ? 'text-emerald-400' : 'text-zinc-500'}>
                    {webhook.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={12} />
                Delete Webhook
              </button>
            </div>
          </div>

          {/* Deliveries */}
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="border-b border-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Recent Deliveries
            </div>
            {deliveries.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                No deliveries yet
              </div>
            ) : (
              <div>
                {deliveries.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5">
                    <span className={getStatusBadge(d.status)}>
                      {d.status === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    </span>
                    <span className="text-xs text-zinc-500 w-36 shrink-0">
                      {new Date(d.timestamp).toLocaleString()}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getSourceBadge(d.source)}`}>
                      {d.source}
                    </span>
                    <span className="text-xs text-zinc-300">{d.event}</span>
                    <span className="ml-auto text-xs text-zinc-500 truncate max-w-[200px]">{d.details}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
