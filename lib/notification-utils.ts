import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { PROJECTS_DATA_DIR, NOTIFICATIONS_CONFIG_FILE, NOTIFICATIONS_HISTORY_FILE } from './constants';
import type { NotificationChannel, NotificationEventType, NotificationHistory } from '@/types/notifications';

export class NotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationError';
  }
}

function getConfigPath(): string {
  return path.join(PROJECTS_DATA_DIR, NOTIFICATIONS_CONFIG_FILE);
}

function getHistoryPath(): string {
  return path.join(PROJECTS_DATA_DIR, NOTIFICATIONS_HISTORY_FILE);
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DATA_DIR, { recursive: true });
}

export async function loadChannels(): Promise<NotificationChannel[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(getConfigPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveChannels(channels: NotificationChannel[]): Promise<void> {
  await ensureDataDir();
  const filePath = getConfigPath();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(channels, null, 2));
  await fs.rename(tmpPath, filePath);
}

export async function loadHistory(): Promise<NotificationHistory[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(getHistoryPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveHistory(history: NotificationHistory[]): Promise<void> {
  await ensureDataDir();
  const filePath = getHistoryPath();
  const tmpPath = filePath + '.tmp';
  const trimmed = history.slice(0, 200);
  await fs.writeFile(tmpPath, JSON.stringify(trimmed, null, 2));
  await fs.rename(tmpPath, filePath);
}

export async function addChannel(channel: Omit<NotificationChannel, 'id' | 'createdAt'>): Promise<NotificationChannel> {
  const channels = await loadChannels();
  const newChannel: NotificationChannel = {
    ...channel,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  channels.push(newChannel);
  await saveChannels(channels);
  return newChannel;
}

export async function updateChannel(id: string, updates: Partial<NotificationChannel>): Promise<NotificationChannel> {
  const channels = await loadChannels();
  const idx = channels.findIndex((c) => c.id === id);
  if (idx === -1) throw new NotificationError('Channel not found.');
  channels[idx] = { ...channels[idx], ...updates, id: channels[idx].id };
  await saveChannels(channels);
  return channels[idx];
}

export async function deleteChannel(id: string): Promise<void> {
  const channels = await loadChannels();
  const filtered = channels.filter((c) => c.id !== id);
  if (filtered.length === channels.length) throw new NotificationError('Channel not found.');
  await saveChannels(filtered);
}

async function sendDiscord(webhookUrl: string, message: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`);
}

async function sendTelegram(botToken: string, chatId: string, message: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  });
  if (!res.ok) throw new Error(`Telegram send failed: ${res.status}`);
}

async function sendLINE(token: string, message: string): Promise<void> {
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `message=${encodeURIComponent(message)}`,
  });
  if (!res.ok) throw new Error(`LINE notify failed: ${res.status}`);
}

async function sendToChannel(channel: NotificationChannel, message: string): Promise<void> {
  switch (channel.type) {
    case 'discord':
      if (!channel.webhookUrl) throw new Error('Discord webhook URL not configured.');
      await sendDiscord(channel.webhookUrl, message);
      break;
    case 'telegram':
      if (!channel.botToken || !channel.chatId) throw new Error('Telegram bot token or chat ID not configured.');
      await sendTelegram(channel.botToken, channel.chatId, message);
      break;
    case 'line':
      if (!channel.lineToken) throw new Error('LINE notify token not configured.');
      await sendLINE(channel.lineToken, message);
      break;
  }
}

export async function notify(event: NotificationEventType, message: string): Promise<void> {
  const channels = await loadChannels();
  const history = await loadHistory();

  for (const channel of channels) {
    if (!channel.enabled || !channel.events.includes(event)) continue;

    const entry: NotificationHistory = {
      id: crypto.randomUUID(),
      channelId: channel.id,
      channelName: channel.name,
      event,
      message,
      status: 'sent',
      timestamp: new Date().toISOString(),
    };

    try {
      await sendToChannel(channel, message);
    } catch (err) {
      entry.status = 'failed';
      entry.error = err instanceof Error ? err.message : 'Unknown error';
    }

    history.unshift(entry);
  }

  await saveHistory(history);
}

export async function testChannel(id: string): Promise<void> {
  const channels = await loadChannels();
  const channel = channels.find((c) => c.id === id);
  if (!channel) throw new NotificationError('Channel not found.');
  await sendToChannel(channel, '🔔 Test notification from Control Panel');
}
