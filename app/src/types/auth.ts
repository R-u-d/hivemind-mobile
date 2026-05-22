import type { User } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface RegisterResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface RefreshRequest {
  refresh: string;
}

export interface RefreshResponse {
  access: string;
  refresh?: string; // returned only when ROTATE_REFRESH_TOKENS=True
}
