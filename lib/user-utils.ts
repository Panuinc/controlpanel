import fs from 'fs/promises';
import path from 'path';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { PROJECTS_DATA_DIR, USERS_DATA_FILE, ADMIN_USERNAME, ADMIN_PASSWORD } from './constants';
import type { User, UserRole, UserPublic } from '@/types/users';

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_\-]{1,30}$/;
const VALID_ROLES: UserRole[] = ['admin', 'deployer', 'viewer'];

function getUsersFilePath(): string {
  return path.join(PROJECTS_DATA_DIR, USERS_DATA_FILE);
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DATA_DIR, { recursive: true });
}

export async function loadUsers(): Promise<User[]> {
  await ensureDataDir();
  const filePath = getUsersFilePath();
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveUsers(users: User[]): Promise<void> {
  await ensureDataDir();
  const filePath = getUsersFilePath();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(users, null, 2));
  await fs.rename(tmpPath, filePath);
}

export async function ensureDefaultAdmin(): Promise<void> {
  const users = await loadUsers();
  if (users.length === 0) {
    const passwordHash = bcryptjs.hashSync(ADMIN_PASSWORD, 10);
    const adminUser: User = {
      id: crypto.randomUUID(),
      username: ADMIN_USERNAME,
      passwordHash,
      role: 'admin',
      twoFactorEnabled: false,
      twoFactorSecret: null,
      recoveryCodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveUsers([adminUser]);
  }
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  await ensureDefaultAdmin();
  const users = await loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  const valid = bcryptjs.compareSync(password, user.passwordHash);
  return valid ? user : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await loadUsers();
  return users.find((u) => u.id === id) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await loadUsers();
  return users.find((u) => u.username === username) || null;
}

export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function validateUsername(username: string): void {
  if (!username || !USERNAME_REGEX.test(username)) {
    throw new UserError('Invalid username. Use 2-31 characters: letters, numbers, hyphens, underscores.');
  }
}

export function validateRole(role: string): asserts role is UserRole {
  if (!VALID_ROLES.includes(role as UserRole)) {
    throw new UserError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }
}

export async function createUser(username: string, password: string, role: UserRole): Promise<User> {
  validateUsername(username);
  validateRole(role);

  if (!password || password.length < 6) {
    throw new UserError('Password must be at least 6 characters.');
  }

  const users = await loadUsers();
  if (users.find((u) => u.username === username)) {
    throw new UserError('Username already exists.');
  }

  const passwordHash = bcryptjs.hashSync(password, 10);
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash,
    role,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    recoveryCodes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(user);
  await saveUsers(users);
  return user;
}

export async function updateUser(id: string, updates: { username?: string; password?: string; role?: UserRole }): Promise<User> {
  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new UserError('User not found.');

  if (updates.username) {
    validateUsername(updates.username);
    if (users.find((u) => u.username === updates.username && u.id !== id)) {
      throw new UserError('Username already exists.');
    }
    users[idx].username = updates.username;
  }

  if (updates.password) {
    if (updates.password.length < 6) throw new UserError('Password must be at least 6 characters.');
    users[idx].passwordHash = bcryptjs.hashSync(updates.password, 10);
  }

  if (updates.role) {
    validateRole(updates.role);
    users[idx].role = updates.role;
  }

  users[idx].updatedAt = new Date().toISOString();
  await saveUsers(users);
  return users[idx];
}

export async function deleteUser(id: string): Promise<void> {
  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new UserError('User not found.');

  const admins = users.filter((u) => u.role === 'admin');
  if (users[idx].role === 'admin' && admins.length <= 1) {
    throw new UserError('Cannot delete the last admin user.');
  }

  users.splice(idx, 1);
  await saveUsers(users);
}

export async function updateUserField(id: string, field: keyof User, value: unknown): Promise<void> {
  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new UserError('User not found.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (users[idx] as any)[field] = value;
  users[idx].updatedAt = new Date().toISOString();
  await saveUsers(users);
}
