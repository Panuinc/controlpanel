export type FrameworkType = 'nodejs' | 'static' | 'python' | 'php' | 'unknown';
export type ProjectStatus = 'stopped' | 'running' | 'building' | 'error' | 'deploying';

export interface ProjectEnvVar {
  key: string;
  value: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  gitUrl: string;
  path: string;
  domain: string;
  framework: FrameworkType;
  port: number;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
  envVars: ProjectEnvVar[];
  status: ProjectStatus;
  pm2Name: string;
  nginxConfigPath: string;
  sslEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastDeployedAt: string | null;
  currentCommit: string;
  previousCommit: string | null;
  buildLog: string;
  errorMessage: string;
}

export interface ProjectCreateRequest {
  gitUrl: string;
  name: string;
  targetDir: string;
}

export interface ProjectConfigureRequest {
  id: string;
  domain?: string;
  port?: number;
  framework?: FrameworkType;
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  envVars?: ProjectEnvVar[];
  sslEnabled?: boolean;
}

export type ProjectAction = 'deploy' | 'start' | 'stop' | 'restart' | 'update' | 'delete' | 'rollback';

export interface ProjectActionRequest {
  id: string;
  action: ProjectAction;
}
