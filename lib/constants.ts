export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
export const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
export const FILE_MANAGER_ROOT = process.env.FILE_MANAGER_ROOT || '/';
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const AUTH_COOKIE_NAME = 'auth-token';
export const JWT_EXPIRY = '24h';
