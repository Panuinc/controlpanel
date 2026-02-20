'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  siteName: string;
  onClose: () => void;
}

export default function SiteEditor({ siteName, onClose }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; output: string } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/nginx/read?name=${encodeURIComponent(siteName)}`);
      const data = await res.json();
      if (res.ok) setContent(data.content);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [siteName]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleTest() {
    try {
      const res = await fetch('/api/nginx/test');
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ valid: false, output: 'Test request failed' });
    }
  }

  async function handleSave() {
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/nginx/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siteName, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      // Test config
      const testRes = await fetch('/api/nginx/test');
      const testData = await testRes.json();
      setTestResult(testData);

      if (testData.valid) {
        // Reload nginx
        await fetch('/api/nginx/reload', { method: 'POST' });
      }
    } catch (err) {
      setTestResult({ valid: false, output: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="flex-1 text-sm font-medium text-white truncate">{siteName}</h2>
        <button
          onClick={handleTest}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
        >
          Test Config
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={13} />
          {saving ? 'Saving...' : 'Save & Reload'}
        </button>
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
          <pre className="whitespace-pre-wrap">{testResult.output}</pre>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-[#0f0f0f] overflow-hidden">
        {loading ? (
          <div className="p-4">
            <div className="h-4 w-48 animate-pulse rounded bg-white/5" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[500px] bg-transparent p-4 text-xs leading-5 text-zinc-300 font-mono outline-none resize-y"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
