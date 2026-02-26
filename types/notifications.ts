export type NotificationChannelType = 'discord' | 'line' | 'telegram';

export type NotificationEventType =
  | 'deploy_success'
  | 'deploy_fail'
  | 'service_down'
  | 'high_cpu'
  | 'high_disk'
  | 'backup_complete'
  | 'login_success'
  | 'login_fail';

export interface NotificationChannel {
  id: string;
  name: string;
  type: NotificationChannelType;
  webhookUrl?: string;
  botToken?: string;
  chatId?: string;
  lineToken?: string;
  events: NotificationEventType[];
  enabled: boolean;
  createdAt: string;
}

export interface NotificationHistory {
  id: string;
  channelId: string;
  channelName: string;
  event: NotificationEventType;
  message: string;
  status: 'sent' | 'failed';
  error?: string;
  timestamp: string;
}
