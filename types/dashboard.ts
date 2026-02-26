export interface WidgetConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

export interface DashboardConfig {
  userId: string;
  theme: 'dark' | 'light';
  pollingInterval: number;
  widgets: WidgetConfig[];
}
