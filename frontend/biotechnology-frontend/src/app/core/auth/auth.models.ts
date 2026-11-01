export type AdminRole = 'centre_director' | 'administrator';

export interface AdminUser {
  id: number | string;
  email: string;
  role: AdminRole;
  mustChangePassword: boolean;
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  admin: AdminUser;
  message?: string;
}

export interface MeResponse {
  success: boolean;
  admin: AdminUser;
}

export interface ApiMessage {
  success: boolean;
  message: string;
  mustChangePassword?: boolean;
}