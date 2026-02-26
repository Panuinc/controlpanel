'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Filter } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  target: string;
  category: string;
  result: 'success' | 'failure';
  details?: string;
}

const categories = [
  'all', 'auth', 'project', 'service', 'file', 'nginx', 'docker', 'system', 'user', 'cron', 'settings',
];

const LIMIT = 50;

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = useCallback(async (currentOffset: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(currentOffset) });
      if (category !== 'all') params.set('category', category);
      const res = await fetch(`/api/audit/list?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEntries((prev) => (append ? [...prev, ...data.entries] : data.entries));
      setTotal(data.total ?? 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category]);

  useEffect(() => {
    setOffset(0);
    setEntries([]);
    fetchLogs(0, false);
  }, [fetchLogs]);

  function handleLoadMore() {
    const next = offset + LIMIT;
    setOffset(next);
    fetchLogs(next, true);
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-white">
          <ScrollText size={18} />
          <h2 className="text-sm font-semibold">Audit Log</h2>
          {!loading && (
            <span className="ml-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
              {total} total
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-zinc-500" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">No audit entries found</div>
        ) : (
          <div className="divide-y divide-white/5">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="shrink-0 text-xs text-zinc-500 sm:w-40">{formatTime(entry.timestamp)}</div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs font-medium text-zinc-300">
                    {entry.username}
                  </span>
                  <span className="truncate text-sm text-white">{entry.action}</span>
                  {entry.target && (
                    <span className="hidden truncate text-xs text-zinc-500 sm:inline">
                      on {entry.target}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                    {entry.category}
                  </span>
                  {entry.result === 'success' ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      Success
                    </span>
                  ) : (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                      Failure
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && entries.length < total && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : `Load More (${entries.length} of ${total})`}
          </button>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="text-xs text-zinc-500">
          Showing {entries.length} of {total} entries
        </div>
      )}
    </div>
  );
}
