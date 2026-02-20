export interface LoginRequest {
  username: string;
  password: string;
}

export interface JWTPayload {
  username: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
}

export interface MeResponse {
  authenticated: boolean;
  username?: string;
}
