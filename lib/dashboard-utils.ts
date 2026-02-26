import fs from 'fs/promises';
import path from 'path';
import { PROJECTS_DATA_DIR, DASHBOARD_CONFIG_FILE } from './constants';
import type { DashboardConfig, WidgetConfig } from '@/types/dashboard';

function getFilePath(): string {
  return path.join(PROJECTS_DATA_DIR, DASHBOARD_CONFIG_FILE);
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DATA_DIR, { recursive: true });
}

async function loadAllConfigs(): Promise<DashboardConfig[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(getFilePath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveAllConfigs(configs: DashboardConfig[]): Promise<void> {
  await ensureDataDir();
  const filePath = getFilePath();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(configs, null, 2));
  await fs.rename(tmpPath, filePath);
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'cpu', label: 'CPU Usage', enabled: true, order: 0 },
  { id: 'memory', label: 'Memory Usage', enabled: true, order: 1 },
  { id: 'disk', label: 'Disk Usage', enabled: true, order: 2 },
  { id: 'network', label: 'Network Traffic', enabled: true, order: 3 },
  { id: 'system', label: 'System Info', enabled: true, order: 4 },
];

export function getDefaultConfig(userId: string): DashboardConfig {
  return {
    userId,
    theme: 'dark',
    pollingInterval: 2000,
    widgets: [...DEFAULT_WIDGETS],
  };
}

export async function getDashboardConfig(userId: string): Promise<DashboardConfig> {
  const configs = await loadAllConfigs();
  const config = configs.find((c) => c.userId === userId);
  return config || getDefaultConfig(userId);
}

export async function saveDashboardConfig(userId: string, updates: Partial<DashboardConfig>): Promise<DashboardConfig> {
  const configs = await loadAllConfigs();
  const idx = configs.findIndex((c) => c.userId === userId);
  const current = idx >= 0 ? configs[idx] : getDefaultConfig(userId);

  const updated: DashboardConfig = {
    ...current,
    ...updates,
    userId,
  };

  if (idx >= 0) {
    configs[idx] = updated;
  } else {
    configs.push(updated);
  }

  await saveAllConfigs(configs);
  return updated;
}
