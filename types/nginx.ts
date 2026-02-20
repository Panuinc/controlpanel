export interface NginxSite {
  name: string;
  configPath: string;
  enabled: boolean;
  domain: string;
  sslConfigured: boolean;
  proxyPass: string | null;
  root: string | null;
}

export type NginxSiteType = 'proxy' | 'static' | 'php';

export interface NginxSiteCreateRequest {
  name: string;
  domain: string;
  type: NginxSiteType;
  proxyPort?: number;
  rootPath?: string;
  ssl?: boolean;
}
