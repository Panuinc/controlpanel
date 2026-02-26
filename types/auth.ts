import type { UserRole } from './users';

export interface LoginRequest {
  username: string;
  password: string;
  totpCode?: string;
}

export interface JWTPayload {
  username: string;
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  success: boolean;
  requires2FA?: boolean;
  tempToken?: string;
  error?: string;
}

export interface MeResponse {
  authenticated: boolean;
  username?: string;
  userId?: string;
  role?: UserRole;
}
