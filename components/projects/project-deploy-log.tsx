'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function ProjectDeployLog({ projectId, onClose }: Props) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const preRef = useRef<HTMLPreElement>(null);

  async function fetchLogs() {
    try {
      const res = await fetch(`/api/projects/logs?id=${projectId}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-medium text-white">Build Logs</h2>
        <div className="flex-1" />
        <button
          onClick={fetchLogs}
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0f0f0f] overflow-hidden">
        {loading ? (
          <div className="p-4">
            <div className="h-4 w-48 animate-pulse rounded bg-white/5" />
          </div>
        ) : (
          <pre
            ref={preRef}
            className="max-h-[600px] overflow-auto p-4 text-xs leading-5 text-zinc-300 font-mono whitespace-pre-wrap"
          >
            {logs || 'No logs available.'}
          </pre>
        )}
      </div>
    </div>
  );
}
