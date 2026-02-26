'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Play, Square, RotateCcw, Trash2, ScrollText, RefreshCw, Download, X } from 'lucide-react';

interface ContainerStats {
  cpuPercent: number;
  memoryUsage: string;
  memoryLimit: string;
  networkIn: string;
  networkOut: string;
}

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'exited' | 'paused' | 'created' | 'restarting';
  stats?: ContainerStats;
}

interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

type Tab = 'containers' | 'images';

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  running: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  exited: { bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
  paused: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  created: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  restarting: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
};

export default function ContainerList() {
  const [tab, setTab] = useState<Tab>('containers');
  const [containers, setContainers] = useState<Container[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [pullImage, setPullImage] = useState('');
  const [pulling, setPulling] = useState(false);

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch('/api/docker/containers?stats=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContainers(data.containers ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load containers');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/docker/images');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages(data.images ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    }
  }, []);

  useEffect(() => {
    if (tab === 'containers') {
      fetchContainers();
    } else {
      fetchImages();
    }
  }, [tab, fetchContainers, fetchImages]);

  async function handleAction(id: string, action: string) {
    if (action === 'remove' && !confirm('Remove this container?')) return;
    try {
      const res = await fetch('/api/docker/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setTimeout(fetchContainers, 1000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  }

  async function handleViewLogs(id: string) {
    if (expandedLogs === id) {
      setExpandedLogs(null);
      return;
    }
    setExpandedLogs(id);
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/docker/logs?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data.logs ?? '');
    } catch (err) {
      setLogs(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLogsLoading(false);
    }
  }

  async function handlePullImage() {
    if (!pullImage.trim()) return;
    setPulling(true);
    try {
      const res = await fetch('/api/docker/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: pullImage }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setPullImage('');
      setTimeout(fetchImages, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Pull failed');
    } finally {
      setPulling(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['containers', 'images'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                tab === t ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={tab === 'containers' ? fetchContainers : fetchImages}
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {tab === 'containers' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl border border-white/10 bg-white/5" />
              ))}
            </div>
          ) : containers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 py-16">
              <Box size={32} className="mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-500">No containers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {containers.map((c) => {
                const colors = STATE_COLORS[c.state] ?? STATE_COLORS.exited;
                return (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Box size={14} className="text-zinc-400" />
                          <h3 className="truncate text-sm font-medium text-white">{c.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {c.state}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-500">{c.image}</p>
                        <p className="mt-0.5 text-xs text-zinc-600">{c.status}</p>
                      </div>
                    </div>

                    {c.stats && (
                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2">
                        <div>
                          <div className="text-[10px] uppercase text-zinc-600">CPU</div>
                          <div className="text-xs font-medium text-white">{c.stats.cpuPercent.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-zinc-600">Memory</div>
                          <div className="text-xs font-medium text-white">
                            {c.stats.memoryUsage} / {c.stats.memoryLimit}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-zinc-600">Network</div>
                          <div className="text-xs font-medium text-white">
                            {c.stats.networkIn} / {c.stats.networkOut}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.state !== 'running' && (
                        <button
                          onClick={() => handleAction(c.id, 'start')}
                          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-emerald-400"
                        >
                          <Play size={11} /> Start
                        </button>
                      )}
                      {c.state === 'running' && (
                        <button
                          onClick={() => handleAction(c.id, 'stop')}
                          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-amber-400"
                        >
                          <Square size={11} /> Stop
                        </button>
                      )}
                      {c.state === 'running' && (
                        <button
                          onClick={() => handleAction(c.id, 'restart')}
                          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-blue-400"
                        >
                          <RotateCcw size={11} /> Restart
                        </button>
                      )}
                      <button
                        onClick={() => handleViewLogs(c.id)}
                        className={`flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs ${
                          expandedLogs === c.id ? 'text-blue-400' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <ScrollText size={11} /> Logs
                      </button>
                      <button
                        onClick={() => handleAction(c.id, 'remove')}
                        className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>

                    {expandedLogs === c.id && (
                      <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-zinc-300">
                        {logsLoading ? (
                          <div className="flex items-center gap-2 text-zinc-500">
                            <RefreshCw size={12} className="animate-spin" /> Loading logs...
                          </div>
                        ) : (
                          <pre className="whitespace-pre-wrap">{logs || 'No logs available'}</pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="text-xs text-zinc-500">
            {containers.length} container{containers.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {tab === 'images' && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={pullImage}
              onChange={(e) => setPullImage(e.target.value)}
              placeholder="Image name (e.g. nginx:latest)"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handlePullImage()}
            />
            <button
              onClick={handlePullImage}
              disabled={pulling || !pullImage.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Download size={14} />
              {pulling ? 'Pulling...' : 'Pull'}
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_1fr_100px] gap-4 border-b border-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <div>Repository</div>
              <div>Tag</div>
              <div>Size</div>
              <div>Created</div>
            </div>
            {images.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">No images found</div>
            ) : (
              <div>
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="grid grid-cols-[1fr_80px_1fr_100px] items-center gap-4 border-b border-white/5 px-4 py-2.5 text-sm hover:bg-white/[0.02]"
                  >
                    <div className="truncate font-mono text-xs text-white">{img.repository}</div>
                    <div className="text-xs text-zinc-400">{img.tag}</div>
                    <div className="text-xs text-zinc-400">{img.size}</div>
                    <div className="text-xs text-zinc-500">{img.created}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-zinc-500">
            {images.length} image{images.length !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  );
}
