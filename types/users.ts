export type UserRole = 'admin' | 'deployer' | 'viewer';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  recoveryCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  id: string;
  username?: string;
  password?: string;
  role?: UserRole;
}

export interface UserPublic {
  id: string;
  username: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
