'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, FileUp } from 'lucide-react';
import type { ProjectEnvVar } from '@/types/projects';

interface Props {
  envVars: ProjectEnvVar[];
  onChange: (envVars: ProjectEnvVar[]) => void;
}

function parseEnvContent(content: string): ProjectEnvVar[] {
  const vars: ProjectEnvVar[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) vars.push({ key, value });
  }
  return vars;
}

export default function ProjectEnvEditor({ envVars, onChange }: Props) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const key = newKey.trim().toUpperCase();
    if (!key) return;
    if (envVars.some((e) => e.key === key)) {
      onChange(envVars.map((e) => (e.key === key ? { key, value: newValue } : e)));
    } else {
      onChange([...envVars, { key, value: newValue }]);
    }
    setNewKey('');
    setNewValue('');
  }

  function handleRemove(key: string) {
    onChange(envVars.filter((e) => e.key !== key));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  function mergeEnvVars(existing: ProjectEnvVar[], incoming: ProjectEnvVar[]): ProjectEnvVar[] {
    const merged = [...existing];
    for (const newVar of incoming) {
      const idx = merged.findIndex((e) => e.key === newVar.key);
      if (idx !== -1) {
        merged[idx] = newVar;
      } else {
        merged.push(newVar);
      }
    }
    return merged;
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const parsed = parseEnvContent(content);
      if (parsed.length > 0) {
        onChange(mergeEnvVars(envVars, parsed));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handlePasteImport() {
    const parsed = parseEnvContent(pasteContent);
    if (parsed.length > 0) {
      onChange(mergeEnvVars(envVars, parsed));
    }
    setPasteContent('');
    setShowPaste(false);
  }

  return (
    <div className="space-y-2">
      {envVars.map((ev) => (
        <div key={ev.key} className="flex items-center gap-2">
          <span className="w-40 truncate rounded bg-white/5 px-2 py-1.5 text-xs font-mono text-zinc-300">
            {ev.key}
          </span>
          <input
            type="text"
            value={ev.value}
            onChange={(e) =>
              onChange(envVars.map((v) => (v.key === ev.key ? { ...v, value: e.target.value } : v)))
            }
            className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleRemove(ev.key)}
            className="rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="KEY"
          className="w-40 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-mono text-white placeholder-zinc-600 outline-none focus:border-blue-500"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="value"
          className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-mono text-white placeholder-zinc-600 outline-none focus:border-blue-500"
        />
        <button
          onClick={handleAdd}
          className="rounded p-1 text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-400"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input ref={fileInputRef} type="file" accept=".env,.env.*,.txt" onChange={handleFileUpload} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <FileUp size={12} />
          Import .env file
        </button>
        <button
          onClick={() => setShowPaste(!showPaste)}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          Paste .env
        </button>
      </div>

      {showPaste && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder={"KEY=value\nDATABASE_URL=postgres://...\nSECRET_KEY=abc123"}
            rows={5}
            className="w-full resize-none rounded border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowPaste(false); setPasteContent(''); }}
              className="rounded px-3 py-1 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handlePasteImport}
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            >
              Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
