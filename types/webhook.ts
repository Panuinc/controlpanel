export interface WebhookConfig {
  id: string;
  projectId: string;
  token: string;
  secret: string;
  branch: string;
  enabled: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  timestamp: string;
  source: string;
  event: string;
  status: 'success' | 'failure' | 'skipped';
  statusCode: number;
  details: string;
}
