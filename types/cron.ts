export interface CronJob {
  id: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  command: string;
  comment: string;
  enabled: boolean;
}

export interface CronJobRequest {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  command: string;
  comment?: string;
}
