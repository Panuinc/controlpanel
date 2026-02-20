import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { NGINX_SITES_AVAILABLE, NGINX_SITES_ENABLED } from './constants';
import type { NginxSite, NginxSiteType } from '@/types/nginx';

export class NginxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NginxError';
  }
}

const SITE_NAME_REGEX = /^[a-zA-Z0-9._\-]+$/;

function validateSiteName(name: string): void {
  if (!name || !SITE_NAME_REGEX.test(name)) {
    throw new NginxError('Invalid site name');
  }
}

function execPromise(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 30000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout + stderr);
      }
    });
  });
}

// --- Config Parsing ---

export function parseNginxConfig(content: string): {
  serverName: string;
  proxyPass: string | null;
  root: string | null;
  sslConfigured: boolean;
} {
  const serverNameMatch = content.match(/server_name\s+([^;]+);/);
  const proxyPassMatch = content.match(/proxy_pass\s+([^;]+);/);
  const rootMatch = content.match(/root\s+([^;]+);/);
  const sslConfigured = /listen\s+443\s+ssl/.test(content) || /ssl_certificate/.test(content);

  return {
    serverName: serverNameMatch ? serverNameMatch[1].trim() : '',
    proxyPass: proxyPassMatch ? proxyPassMatch[1].trim() : null,
    root: rootMatch ? rootMatch[1].trim() : null,
    sslConfigured,
  };
}

// --- Site Management ---

export async function listNginxSites(): Promise<NginxSite[]> {
  const sites: NginxSite[] = [];

  try {
    const availableFiles = await fs.readdir(NGINX_SITES_AVAILABLE);
    let enabledFiles: string[] = [];
    try {
      enabledFiles = await fs.readdir(NGINX_SITES_ENABLED);
    } catch { /* sites-enabled might not exist */ }

    for (const file of availableFiles) {
      const configPath = path.join(NGINX_SITES_AVAILABLE, file);
      const stat = await fs.stat(configPath);
      if (!stat.isFile()) continue;

      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = parseNginxConfig(content);

      sites.push({
        name: file,
        configPath,
        enabled: enabledFiles.includes(file),
        domain: parsed.serverName,
        sslConfigured: parsed.sslConfigured,
        proxyPass: parsed.proxyPass,
        root: parsed.root,
      });
    }
  } catch (err) {
    throw new NginxError(`Failed to list sites: ${err instanceof Error ? err.message : String(err)}`);
  }

  return sites.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readNginxConfig(name: string): Promise<string> {
  validateSiteName(name);
  const configPath = path.join(NGINX_SITES_AVAILABLE, name);
  return fs.readFile(configPath, 'utf-8');
}

export async function writeNginxConfig(name: string, content: string): Promise<void> {
  validateSiteName(name);
  const configPath = path.join(NGINX_SITES_AVAILABLE, name);
  await fs.writeFile(configPath, content);
}

export async function deleteNginxConfig(name: string): Promise<void> {
  validateSiteName(name);
  // Disable first
  try {
    await disableSite(name);
  } catch { /* might not be enabled */ }
  const configPath = path.join(NGINX_SITES_AVAILABLE, name);
  await fs.unlink(configPath);
}

export async function enableSite(name: string): Promise<void> {
  validateSiteName(name);
  const source = path.join(NGINX_SITES_AVAILABLE, name);
  const target = path.join(NGINX_SITES_ENABLED, name);

  // Check source exists
  await fs.access(source);

  // Create symlink
  try {
    await fs.unlink(target);
  } catch { /* might not exist */ }
  await fs.symlink(source, target);
}

export async function disableSite(name: string): Promise<void> {
  validateSiteName(name);
  const target = path.join(NGINX_SITES_ENABLED, name);
  await fs.unlink(target);
}

export async function testNginxConfig(): Promise<{ valid: boolean; output: string }> {
  try {
    const output = await execPromise('nginx', ['-t']);
    return { valid: true, output };
  } catch (err) {
    return { valid: false, output: err instanceof Error ? err.message : String(err) };
  }
}

export async function reloadNginx(): Promise<string> {
  const test = await testNginxConfig();
  if (!test.valid) {
    throw new NginxError(`Nginx config test failed:\n${test.output}`);
  }
  return execPromise('systemctl', ['reload', 'nginx']);
}

export async function getNginxLogs(site: string, logType: 'access' | 'error', lines: number = 100): Promise<string> {
  const safeLines = Math.min(Math.max(1, lines), 10000);
  const logFile = logType === 'access' ? '/var/log/nginx/access.log' : '/var/log/nginx/error.log';
  return execPromise('tail', ['-n', String(safeLines), logFile]);
}

// --- Config Generation ---

export function generateNginxConfig(options: {
  domain: string;
  type: NginxSiteType;
  port?: number;
  rootPath?: string;
  projectName?: string;
}): string {
  const { domain, type, port, rootPath } = options;

  if (type === 'proxy' && port) {
    return `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
`;
  }

  if (type === 'static') {
    const root = rootPath || `/var/www/${domain}`;
    return `server {
    listen 80;
    server_name ${domain};
    root ${root};
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;
  }

  if (type === 'php') {
    const root = rootPath || `/var/www/${domain}`;
    return `server {
    listen 80;
    server_name ${domain};
    root ${root};
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
    }

    location ~ /\\.ht {
        deny all;
    }
}
`;
  }

  return `server {
    listen 80;
    server_name ${domain};

    location / {
        return 200 'Site not configured';
        add_header Content-Type text/plain;
    }
}
`;
}
