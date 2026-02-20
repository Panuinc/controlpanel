export interface ServiceInfo {
  name: string;
  loadState: string;
  activeState: string;
  subState: string;
  description: string;
}

export type ServiceAction = 'start' | 'stop' | 'restart' | 'enable' | 'disable';
