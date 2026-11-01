import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  AdminRole,
  AdminUser,
  AuthResponse,
  MeResponse,
  ApiMessage,
} from './auth.models';

import { environment } from '../../../environments/environment.development';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly accessTokenState = signal<string | null>(null);
  private readonly adminState = signal<AdminUser | null>(null);

  private restorePromise: Promise<boolean> | null = null;

  readonly admin = this.adminState.asReadonly();

  readonly isAuthenticated = computed(
    () => !!this.accessTokenState() && !!this.adminState()
  );

  readonly role = computed(
    () => this.adminState()?.role ?? null
  );

  readonly mustChangePassword = computed(
    () => this.adminState()?.mustChangePassword ?? false
  );

  getAccessToken(): string | null {
    return this.accessTokenState();
  }

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(
        `${API_URL}/auth/login`,
        { email, password },
        { withCredentials: true }
      )
    );

    if (
      !response.success ||
      !response.accessToken ||
      !response.admin
    ) {
      throw new Error('The server returned an incomplete login response.');
    }

    this.setSession(response.accessToken, response.admin);
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<ApiMessage>(
        `${API_URL}/auth/change-password`,
        {
          currentPassword,
          newPassword,
        },
        { withCredentials: true }
      )
    );

    if (!response.success) {
      throw new Error(
        response.message || 'Password change failed.'
      );
    }

    const currentAdmin = this.adminState();

    if (currentAdmin) {
      this.adminState.set({
        ...currentAdmin,
        mustChangePassword: false,
      });
    }
  }

  async restoreSession(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true;
    }

    if (this.restorePromise) {
      return this.restorePromise;
    }

    this.restorePromise = this.restoreSessionRequest();

    try {
      return await this.restorePromise;
    } finally {
      this.restorePromise = null;
    }
  }

  private async restoreSessionRequest(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
      );

      if (
        !response.success ||
        !response.accessToken ||
        !response.admin
      ) {
        this.clearSession();
        return false;
      }

      this.setSession(response.accessToken, response.admin);

      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  async refreshAdminProfile(): Promise<boolean> {
    if (!this.accessTokenState()) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<MeResponse>(
          `${API_URL}/auth/me`,
          { withCredentials: true }
        )
      );

      if (!response.success || !response.admin) {
        return false;
      }

      this.adminState.set(response.admin);

      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${API_URL}/auth/logout`,
          {},
          { withCredentials: true }
        )
      );
    } finally {
      this.clearSession();
    }
  }

  hasRole(roles: AdminRole[]): boolean {
    const currentRole = this.adminState()?.role;

    return !!currentRole && roles.includes(currentRole);
  }

  private setSession(
    token: string,
    admin: AdminUser
  ): void {
    this.accessTokenState.set(token);
    this.adminState.set(admin);
  }

  private clearSession(): void {
    this.accessTokenState.set(null);
    this.adminState.set(null);
  }
}