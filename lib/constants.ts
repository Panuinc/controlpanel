export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
export const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
export const FILE_MANAGER_ROOT = process.env.FILE_MANAGER_ROOT || '/';
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const AUTH_COOKIE_NAME = 'auth-token';
export const JWT_EXPIRY = '24h';

// Projects
export const PROJECTS_DATA_DIR = process.env.PROJECTS_DATA_DIR || '/opt/controlpanel/data';
export const DEFAULT_PROJECT_DIR = process.env.DEFAULT_PROJECT_DIR || '/var/www';
export const DEFAULT_APP_PORT_START = 3100;
export const PM2_PATH = process.env.PM2_PATH || 'pm2';
export const GIT_PATH = process.env.GIT_PATH || 'git';

// Nginx
export const NGINX_SITES_AVAILABLE = '/etc/nginx/sites-available';
export const NGINX_SITES_ENABLED = '/etc/nginx/sites-enabled';
