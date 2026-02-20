'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';

interface Props {
  filePath: string;
  onClose: () => void;
}

export default function FileEditor({ filePath, onClose }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filePath]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const fileName = filePath.split('/').pop() || filePath;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="text-sm font-medium text-white">{fileName}</div>
            <div className="text-xs text-zinc-500">{filePath}</div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-4 h-96 animate-pulse rounded-xl border border-white/10 bg-white/5" />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); } }}
          className="mt-4 flex-1 resize-none rounded-xl border border-white/10 bg-[#0f0f0f] p-4 font-mono text-sm text-zinc-200 outline-none focus:border-blue-500/50"
          spellCheck={false}
        />
      )}
    </div>
  );
}
