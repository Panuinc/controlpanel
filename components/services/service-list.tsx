'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ServiceInfo } from '@/types/services';
import ServiceRow from './service-row';
import ServiceLogViewer from './service-log-viewer';
import { RefreshCw, Search } from 'lucide-react';

type Filter = 'all' | 'running' | 'failed';

export default function ServiceList() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?filter=${filter}` : '';
      const res = await fetch(`/api/services/list${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setServices(data.services);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  async function handleAction(name: string, action: string) {
    try {
      const res = await fetch('/api/services/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setTimeout(fetchServices, 1000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  }

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  if (viewingLogs) {
    return <ServiceLogViewer name={viewingLogs} onClose={() => setViewingLogs(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['all', 'running', 'failed'] as Filter[]).map((f) => (
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
              placeholder="Search services..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={fetchServices}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px_80px_120px] gap-4 border-b border-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <div>Service</div>
          <div className="text-center">Status</div>
          <div className="text-center">State</div>
          <div className="text-center">Logs</div>
          <div className="text-center">Actions</div>
        </div>

        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : (
          <div>
            {filtered.map((service) => (
              <ServiceRow
                key={service.name}
                service={service}
                onAction={handleAction}
                onViewLogs={() => setViewingLogs(service.name)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                No services found
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500">
        {filtered.length} service{filtered.length !== 1 ? 's' : ''} shown
      </div>
    </div>
  );
}
