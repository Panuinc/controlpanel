import fs from 'fs/promises';
import path from 'path';
import { PROJECTS_DATA_DIR, IP_FILTER_FILE } from './constants';
import type { IPFilterConfig, IPRule } from '@/types/ip-filter';

function getFilePath(): string {
  return path.join(PROJECTS_DATA_DIR, IP_FILTER_FILE);
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DATA_DIR, { recursive: true });
}

export async function loadIPFilter(): Promise<IPFilterConfig> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(getFilePath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return { enabled: false, mode: 'blacklist', rules: [] };
  }
}

export async function saveIPFilter(config: IPFilterConfig): Promise<void> {
  await ensureDataDir();
  const filePath = getFilePath();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(config, null, 2));
  await fs.rename(tmpPath, filePath);
}

function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function cidrMatch(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(range) & mask);
}

export function isIPAllowed(ip: string, config: IPFilterConfig): boolean {
  if (!config.enabled) return true;

  const cleanIP = ip.includes(',') ? ip.split(',')[0].trim() : ip.trim();
  const matchesRule = config.rules.some((rule) => cidrMatch(cleanIP, rule.ip));

  if (config.mode === 'whitelist') {
    return matchesRule;
  }
  return !matchesRule;
}

export function validateIPOrCIDR(value: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (!ipRegex.test(value)) return false;

  const [ip, mask] = value.split('/');
  const parts = ip.split('.').map(Number);
  if (parts.some((p) => p < 0 || p > 255)) return false;
  if (mask !== undefined && (parseInt(mask) < 0 || parseInt(mask) > 32)) return false;

  return true;
}

export async function addIPRule(ip: string, description: string): Promise<IPFilterConfig> {
  if (!validateIPOrCIDR(ip)) {
    throw new Error('Invalid IP address or CIDR notation.');
  }
  const config = await loadIPFilter();
  if (config.rules.find((r) => r.ip === ip)) {
    throw new Error('IP rule already exists.');
  }
  const rule: IPRule = { ip, description, createdAt: new Date().toISOString() };
  config.rules.push(rule);
  await saveIPFilter(config);
  return config;
}

export async function removeIPRule(ip: string): Promise<IPFilterConfig> {
  const config = await loadIPFilter();
  config.rules = config.rules.filter((r) => r.ip !== ip);
  await saveIPFilter(config);
  return config;
}
