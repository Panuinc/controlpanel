'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, Calendar, X } from 'lucide-react';

interface CronJob {
  id: string;
  schedule: string;
  command: string;
  comment: string;
  enabled: boolean;
  description?: string;
}

interface CronForm {
  preset: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  command: string;
  comment: string;
}

const presets: Record<string, { label: string; cron: string }> = {
  custom: { label: 'Custom', cron: '' },
  everyMinute: { label: 'Every Minute', cron: '* * * * *' },
  hourly: { label: 'Hourly', cron: '0 * * * *' },
  daily: { label: 'Daily (midnight)', cron: '0 0 * * *' },
  weekly: { label: 'Weekly (Sunday)', cron: '0 0 * * 0' },
  monthly: { label: 'Monthly (1st)', cron: '0 0 1 * *' },
};

const emptyForm: CronForm = {
  preset: 'custom',
  minute: '*',
  hour: '*',
  dayOfMonth: '*',
  month: '*',
  dayOfWeek: '*',
  command: '',
  comment: '',
};

function describeCron(s: string): string {
  const map: Record<string, string> = {
    '* * * * *': 'Every minute',
    '0 * * * *': 'Every hour',
    '0 0 * * *': 'Daily at midnight',
    '0 0 * * 0': 'Weekly on Sunday',
    '0 0 1 * *': 'Monthly on the 1st',
  };
  return map[s] || s;
}

export default function CronList() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CronForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJobs(data.jobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cron jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  function applyPreset(key: string) {
    const p = presets[key];
    if (key === 'custom') {
      setForm((f) => ({ ...f, preset: 'custom' }));
      return;
    }
    const [minute, hour, dayOfMonth, month, dayOfWeek] = p.cron.split(' ');
    setForm((f) => ({ ...f, preset: key, minute, hour, dayOfMonth, month, dayOfWeek }));
  }

  function buildSchedule(): string {
    return `${form.minute} ${form.hour} ${form.dayOfMonth} ${form.month} ${form.dayOfWeek}`;
  }

  async function handleSave() {
    const schedule = buildSchedule();
    if (!form.command.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/cron/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, command: form.command, comment: form.comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModal(false);
      setForm(emptyForm);
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cron job');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/cron/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteId(null);
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cron job');
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Clock size={18} />
          <h2 className="text-sm font-semibold">Cron Jobs</h2>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowModal(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Job</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">No cron jobs configured</div>
        ) : (
          <div className="divide-y divide-white/5">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-start gap-4 px-4 py-3 hover:bg-white/[0.02]">
                <div className="mt-0.5 shrink-0">
                  <Calendar size={16} className={job.enabled ? 'text-emerald-400' : 'text-zinc-600'} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-blue-400">
                      {job.schedule}
                    </code>
                    <span className="text-xs text-zinc-500">{describeCron(job.schedule)}</span>
                    {!job.enabled && (
                      <span className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
                        disabled
                      </span>
                    )}
                  </div>
                  <div className="truncate font-mono text-sm text-zinc-300">{job.command}</div>
                  {job.comment && (
                    <div className="mt-0.5 truncate text-xs text-zinc-500">{job.comment}</div>
                  )}
                </div>
                <button
                  onClick={() => setDeleteId(job.id)}
                  className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                  title="Delete job"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</div>

      {/* Add Job Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Add Cron Job</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              {/* Preset Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Preset</label>
                <select
                  value={form.preset}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  {Object.entries(presets).map(([key, p]) => (
                    <option key={key} value={key}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Cron Fields */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Schedule (cron expression)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'minute' as const, label: 'Min' },
                    { key: 'hour' as const, label: 'Hour' },
                    { key: 'dayOfMonth' as const, label: 'Day' },
                    { key: 'month' as const, label: 'Mon' },
                    { key: 'dayOfWeek' as const, label: 'DoW' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="mb-1 block text-center text-[10px] text-zinc-500">{f.label}</label>
                      <input
                        type="text"
                        value={form[f.key]}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value, preset: 'custom' }))}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center font-mono text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-center font-mono text-xs text-zinc-500">
                  {buildSchedule()}
                </p>
              </div>

              {/* Command */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Command</label>
                <textarea
                  value={form.command}
                  onChange={(e) => setForm({ ...form, command: e.target.value })}
                  placeholder="/usr/bin/command --flag"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Comment</label>
                <input
                  type="text"
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="Describe this job"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.command.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
            <div className="p-5 text-center">
              <Trash2 size={32} className="mx-auto mb-3 text-red-400" />
              <h3 className="mb-1 text-sm font-semibold text-white">Delete Cron Job</h3>
              <p className="text-xs text-zinc-400">Are you sure you want to delete this job?</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
