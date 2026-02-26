export type AuditCategory = 'auth' | 'project' | 'service' | 'file' | 'nginx' | 'docker' | 'system' | 'database' | 'cron' | 'firewall' | 'ssl' | 'backup' | 'notification' | 'webhook' | 'user';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  category: AuditCategory;
  target: string;
  details: string;
  result: 'success' | 'failure';
  ip: string;
}
