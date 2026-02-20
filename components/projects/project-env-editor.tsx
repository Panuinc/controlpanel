'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ProjectEnvVar } from '@/types/projects';

interface Props {
  envVars: ProjectEnvVar[];
  onChange: (envVars: ProjectEnvVar[]) => void;
}

export default function ProjectEnvEditor({ envVars, onChange }: Props) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

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
    </div>
  );
}
