'use client';

import { useState } from 'react';
import type { ProjectConfig, FrameworkType } from '@/types/projects';
import ProjectEnvEditor from './project-env-editor';

interface Props {
  project: ProjectConfig;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

export default function ProjectConfigure({ project, onSave, onClose }: Props) {
  const [domain, setDomain] = useState(project.domain);
  const [port, setPort] = useState(String(project.port));
  const [framework, setFramework] = useState<FrameworkType>(project.framework);
  const [installCommand, setInstallCommand] = useState(project.installCommand);
  const [buildCommand, setBuildCommand] = useState(project.buildCommand);
  const [startCommand, setStartCommand] = useState(project.startCommand);
  const [envVars, setEnvVars] = useState(project.envVars);
  const [gitUsername, setGitUsername] = useState(project.gitUsername || '');
  const [gitToken, setGitToken] = useState(project.gitToken || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        domain,
        port: parseInt(port, 10) || 0,
        framework,
        installCommand,
        buildCommand,
        startCommand,
        envVars,
        gitUsername,
        gitToken,
      });
      onClose();
    } catch {
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Domain</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="3000"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Framework</label>
        <select
          value={framework}
          onChange={(e) => setFramework(e.target.value as FrameworkType)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="nodejs">Node.js</option>
          <option value="static">Static</option>
          <option value="python">Python</option>
          <option value="php">PHP</option>
          <option value="unknown">Other</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Install Command</label>
        <input
          type="text"
          value={installCommand}
          onChange={(e) => setInstallCommand(e.target.value)}
          placeholder="npm install"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Build Command</label>
        <input
          type="text"
          value={buildCommand}
          onChange={(e) => setBuildCommand(e.target.value)}
          placeholder="npm run build"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Start Command</label>
        <input
          type="text"
          value={startCommand}
          onChange={(e) => setStartCommand(e.target.value)}
          placeholder="npm start"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Environment Variables</label>
        <ProjectEnvEditor envVars={envVars} onChange={setEnvVars} />
      </div>

      <div className="border-t border-white/10 pt-4">
        <label className="mb-3 block text-xs font-medium text-zinc-400">Git Credentials (for private repos)</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">Username</label>
            <input
              type="text"
              value={gitUsername}
              onChange={(e) => setGitUsername(e.target.value)}
              placeholder="username"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">Personal Access Token</label>
            <input
              type="password"
              value={gitToken}
              onChange={(e) => setGitToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-600">เก็บ credentials ไว้ใช้ตอน git pull อัตโนมัติ ไม่ต้องกรอกทุกครั้ง</p>
      </div>

      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
