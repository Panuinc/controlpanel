'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface Props {
  name: string;
  onClose: () => void;
}

export default function ServiceLogViewer({ name, onClose }: Props) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState(200);
  const logRef = useRef<HTMLPreElement>(null);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/services/logs?name=${encodeURIComponent(name)}&lines=${lines}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data.logs);
    } catch (err) {
      setLogs(`Error: ${err instanceof Error ? err.message : 'Failed to load logs'}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [lines]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="text-sm font-medium text-white">{name}</div>
            <div className="text-xs text-zinc-500">Service Logs</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={lines}
            onChange={(e) => setLines(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
          >
            <option value={50}>50 lines</option>
            <option value={100}>100 lines</option>
            <option value={200}>200 lines</option>
            <option value={500}>500 lines</option>
            <option value={1000}>1000 lines</option>
          </select>
          <button
            onClick={fetchLogs}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <pre
        ref={logRef}
        className="flex-1 overflow-auto rounded-xl border border-white/10 bg-[#0f0f0f] p-4 font-mono text-xs leading-relaxed text-zinc-300"
      >
        {loading ? 'Loading logs...' : logs || 'No logs available'}
      </pre>
    </div>
  );
}
