export interface IPRule {
  ip: string;
  description: string;
  createdAt: string;
}

export interface IPFilterConfig {
  enabled: boolean;
  mode: 'whitelist' | 'blacklist';
  rules: IPRule[];
}
