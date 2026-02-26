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

// Users
export const USERS_DATA_FILE = 'users.json';

// Audit
export const AUDIT_LOG_FILE = 'audit.json';
export const AUDIT_MAX_ENTRIES = 10000;

// IP Filter
export const IP_FILTER_FILE = 'ip-filter.json';

// Database Connections
export const DATABASE_CONNECTIONS_FILE = 'database-connections.json';

// Webhooks
export const WEBHOOKS_DATA_FILE = 'webhooks.json';
export const WEBHOOK_DELIVERIES_FILE = 'webhook-deliveries.json';

// Backups
export const BACKUPS_DIR = 'backups';
export const BACKUPS_INDEX_FILE = 'backups-index.json';
export const BACKUP_MAX_COUNT = 10;

// Notifications
export const NOTIFICATIONS_CONFIG_FILE = 'notifications.json';
export const NOTIFICATIONS_HISTORY_FILE = 'notification-history.json';

// Dashboard
export const DASHBOARD_CONFIG_FILE = 'dashboard-configs.json';
