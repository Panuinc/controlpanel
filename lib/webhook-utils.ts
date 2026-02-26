import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { PROJECTS_DATA_DIR, WEBHOOKS_DATA_FILE, WEBHOOK_DELIVERIES_FILE } from './constants';
import type { WebhookConfig, WebhookDelivery } from '@/types/webhook';

export class WebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookError';
  }
}

function getWebhooksPath(): string {
  return path.join(PROJECTS_DATA_DIR, WEBHOOKS_DATA_FILE);
}

function getDeliveriesPath(): string {
  return path.join(PROJECTS_DATA_DIR, WEBHOOK_DELIVERIES_FILE);
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DATA_DIR, { recursive: true });
}

export async function loadWebhooks(): Promise<WebhookConfig[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(getWebhooksPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveWebhooks(webhooks: WebhookConfig[]): Promise<void> {
  await ensureDataDir();
  const filePath = getWebhooksPath();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(webhooks, null, 2));
  await fs.rename(tmpPath, filePath);
}

export async function loadDeliveries(webhookId?: string): Promise<WebhookDelivery[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(getDeliveriesPath(), 'utf-8');
    const deliveries: WebhookDelivery[] = JSON.parse(data);
    if (webhookId) return deliveries.filter((d) => d.webhookId === webhookId);
    return deliveries;
  } catch {
    return [];
  }
}

async function saveDeliveries(deliveries: WebhookDelivery[]): Promise<void> {
  await ensureDataDir();
  const filePath = getDeliveriesPath();
  const tmpPath = filePath + '.tmp';
  // Keep max 500 deliveries
  const trimmed = deliveries.slice(0, 500);
  await fs.writeFile(tmpPath, JSON.stringify(trimmed, null, 2));
  await fs.rename(tmpPath, filePath);
}

export async function createWebhook(projectId: string, branch: string = 'main'): Promise<WebhookConfig> {
  const webhooks = await loadWebhooks();

  const existing = webhooks.find((w) => w.projectId === projectId);
  if (existing) throw new WebhookError('Webhook already exists for this project.');

  const webhook: WebhookConfig = {
    id: crypto.randomUUID(),
    projectId,
    token: crypto.randomUUID(),
    secret: crypto.randomBytes(32).toString('hex'),
    branch,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  webhooks.push(webhook);
  await saveWebhooks(webhooks);
  return webhook;
}

export async function getWebhookByToken(token: string): Promise<WebhookConfig | null> {
  const webhooks = await loadWebhooks();
  return webhooks.find((w) => w.token === token) || null;
}

export async function getWebhooksByProject(projectId: string): Promise<WebhookConfig[]> {
  const webhooks = await loadWebhooks();
  return webhooks.filter((w) => w.projectId === projectId);
}

export async function deleteWebhook(id: string): Promise<void> {
  const webhooks = await loadWebhooks();
  const filtered = webhooks.filter((w) => w.id !== id);
  if (filtered.length === webhooks.length) throw new WebhookError('Webhook not found.');
  await saveWebhooks(filtered);
}

export function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifyGitLabToken(token: string, secret: string): boolean {
  return token === secret;
}

export function extractBranchFromPayload(body: Record<string, unknown>): string | null {
  // GitHub
  if (typeof body.ref === 'string') {
    const match = (body.ref as string).match(/^refs\/heads\/(.+)$/);
    return match ? match[1] : null;
  }
  return null;
}

export async function recordDelivery(delivery: WebhookDelivery): Promise<void> {
  const deliveries = await loadDeliveries();
  deliveries.unshift(delivery);
  await saveDeliveries(deliveries);
}
