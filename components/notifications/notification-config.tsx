'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Send, Pencil, Trash2, CheckCircle, XCircle, X, RefreshCw } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: 'discord' | 'telegram' | 'line';
  enabled: boolean;
  events: string[];
  config: Record<string, string>;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  channel: string;
  event: string;
  message: string;
  status: 'sent' | 'failed';
}

type Tab = 'channels' | 'history';

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  discord: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  telegram: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  line: { bg: 'bg-green-500/10', text: 'text-green-400' },
};

const ALL_EVENTS = ['deploy', 'backup', 'ssl_expiry', 'service_down', 'high_cpu', 'high_memory', 'disk_full'];

export default function NotificationConfig() {
  const [tab, setTab] = useState<Tab>('channels');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/config');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChannels(data.channels ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/history');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHistory(data.history ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    }
  }, []);

  useEffect(() => {
    if (tab === 'channels') {
      fetchChannels();
    } else {
      fetchHistory();
    }
  }, [tab, fetchChannels, fetchHistory]);

  async function handleToggle(channel: Channel) {
    try {
      const res = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: channel.id, enabled: !channel.enabled }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchChannels();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this notification channel?')) return;
    try {
      const res = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchChannels();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      alert('Test notification sent');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['channels', 'history'] as Tab[]).map((t) => (
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
        <div className="flex gap-2">
          <button
            onClick={tab === 'channels' ? fetchChannels : fetchHistory}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={16} />
          </button>
          {tab === 'channels' && (
            <button
              onClick={() => {
                setEditingChannel(null);
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Channel</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {tab === 'channels' && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5" />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 py-16">
              <Bell size={32} className="mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-500">No notification channels configured</p>
              <button
                onClick={() => {
                  setEditingChannel(null);
                  setShowModal(true);
                }}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Add your first channel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((channel) => {
                const colors = TYPE_COLORS[channel.type] ?? TYPE_COLORS.discord;
                return (
                  <div
                    key={channel.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Bell size={14} className="text-zinc-400" />
                          <h3 className="text-sm font-medium text-white">{channel.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors.bg} ${colors.text}`}>
                            {channel.type}
                          </span>
                          <button
                            onClick={() => handleToggle(channel)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                              channel.enabled ? 'bg-blue-600' : 'bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition ${
                                channel.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {channel.events.map((event) => (
                            <span
                              key={event}
                              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400"
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleTest(channel.id)}
                          disabled={testingId === channel.id}
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white disabled:opacity-50"
                          title="Send test notification"
                        >
                          <Send size={13} className={testingId === channel.id ? 'animate-pulse' : ''} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingChannel(channel);
                            setShowModal(true);
                          }}
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(channel.id)}
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="text-xs text-zinc-500">
            {channels.length} channel{channels.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {tab === 'history' && (
        <>
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="grid grid-cols-[140px_100px_120px_1fr_70px] gap-4 border-b border-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <div>Timestamp</div>
              <div>Channel</div>
              <div>Event</div>
              <div>Message</div>
              <div className="text-center">Status</div>
            </div>
            {history.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">No notification history</div>
            ) : (
              <div>
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[140px_100px_120px_1fr_70px] items-center gap-4 border-b border-white/5 px-4 py-2.5 text-sm hover:bg-white/[0.02]"
                  >
                    <div className="text-xs text-zinc-500">
                      {new Date(entry.timestamp).toLocaleDateString()}{' '}
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="truncate text-xs text-zinc-300">{entry.channel}</div>
                    <div className="truncate text-xs text-zinc-400">{entry.event}</div>
                    <div className="truncate text-xs text-zinc-400">{entry.message}</div>
                    <div className="flex justify-center">
                      {entry.status === 'sent' ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle size={12} /> Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <XCircle size={12} /> Failed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-zinc-500">
            {history.length} notification{history.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {showModal && (
        <ChannelModal
          channel={editingChannel}
          onClose={() => {
            setShowModal(false);
            setEditingChannel(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingChannel(null);
            fetchChannels();
          }}
        />
      )}
    </div>
  );
}

function ChannelModal({
  channel,
  onClose,
  onSaved,
}: {
  channel: Channel | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!channel;
  const [name, setName] = useState(channel?.name ?? '');
  const [type, setType] = useState<'discord' | 'telegram' | 'line'>(channel?.type ?? 'discord');
  const [events, setEvents] = useState<string[]>(channel?.events ?? []);
  const [webhookUrl, setWebhookUrl] = useState(channel?.config?.webhookUrl ?? '');
  const [botToken, setBotToken] = useState(channel?.config?.botToken ?? '');
  const [chatId, setChatId] = useState(channel?.config?.chatId ?? '');
  const [lineToken, setLineToken] = useState(channel?.config?.token ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  async function handleSubmit() {
    if (!name) {
      setError('Name is required');
      return;
    }
    if (events.length === 0) {
      setError('Select at least one event');
      return;
    }

    const config: Record<string, string> = {};
    if (type === 'discord') {
      if (!webhookUrl) { setError('Webhook URL is required'); return; }
      config.webhookUrl = webhookUrl;
    } else if (type === 'telegram') {
      if (!botToken || !chatId) { setError('Bot token and chat ID are required'); return; }
      config.botToken = botToken;
      config.chatId = chatId;
    } else if (type === 'line') {
      if (!lineToken) { setError('LINE token is required'); return; }
      config.token = lineToken;
    }

    setSaving(true);
    setError(null);
    try {
      const body = isEditing
        ? { action: 'update', id: channel.id, name, type, events, config }
        : { action: 'create', name, type, events, config };

      const res = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save channel');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">
              {isEditing ? 'Edit Channel' : 'Add Channel'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Discord Alerts"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Type</label>
            <div className="flex gap-2">
              {(['discord', 'telegram', 'line'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-4 py-2 text-xs font-medium capitalize transition ${
                    type === t
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {t === 'line' ? 'LINE' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {type === 'discord' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Webhook URL</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
            </div>
          )}

          {type === 'telegram' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Bot Token</label>
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456:ABC-DEF..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Chat ID</label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="-1001234567890"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {type === 'line' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">LINE Notify Token</label>
              <input
                type="text"
                value={lineToken}
                onChange={(e) => setLineToken(e.target.value)}
                placeholder="Token..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Events</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map((event) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"
                >
                  <input
                    type="checkbox"
                    checked={events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-white/20 bg-white/5 text-blue-600"
                  />
                  {event.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditing ? 'Update Channel' : 'Add Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}
