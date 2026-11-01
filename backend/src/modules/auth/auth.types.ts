export type AdminRole = 'centre_director' | 'administrator';

export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  must_change_password: boolean;
}

export interface AuthenticatedAdmin {
  id: number;
  email: string;
  role: AdminRole;
  mustChangePassword: boolean;
}