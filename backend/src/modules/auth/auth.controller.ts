import type { Request, Response } from 'express';

import {
  loginSchema,
  changePasswordSchema,
} from './auth.schemas.js';

import {
  login,
  logout,
  refreshSession,
  changeAdminPassword,
} from './auth.service.js';

const COOKIE_NAME = 'biotech_refresh';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export async function loginController(
  req: Request,
  res: Response,
): Promise<void> {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: 'Please provide a valid email and password.',
    });
    return;
  }

  try {
    const result = await login(
      validation.data.email,
      validation.data.password,
    );

    res.cookie(COOKIE_NAME, result.refreshToken, cookieOptions());

    res.json({
      success: true,
      message: 'Login successful.',
      admin: result.admin,
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    console.error('Administrator login failed:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to complete login.',
    });
  }
}

export async function refreshController(
  req: Request,
  res: Response,
): Promise<void> {
  const refreshToken = req.cookies?.[COOKIE_NAME] as string | undefined;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      message: 'Your session has expired. Please sign in again.',
    });
    return;
  }

  try {
    const result = await refreshSession(refreshToken);

    res.cookie(COOKIE_NAME, result.refreshToken, cookieOptions());

    res.json({
      success: true,
      message: 'Session refreshed.',
      admin: result.admin,
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_REFRESH_TOKEN') {
      res.clearCookie(COOKIE_NAME, cookieOptions());

      res.status(401).json({
        success: false,
        message: 'Your session has expired. Please sign in again.',
      });
      return;
    }

    console.error('Session refresh failed:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to refresh your session.',
    });
  }
}

export async function changePasswordController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  const validation = changePasswordSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: 'The new password must contain at least 12 characters.',
    });
    return;
  }

  try {
    const refreshToken = req.cookies?.[COOKIE_NAME] as string | undefined;

    await changeAdminPassword(
      req.auth.id,
      validation.data.currentPassword,
      validation.data.newPassword,
      refreshToken,
      req.ip,
    );

    res.json({
      success: true,
      message: 'Your password has been changed successfully.',
      mustChangePassword: false,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_CURRENT_PASSWORD') {
        res.status(401).json({
          success: false,
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Your current password is incorrect.',
        });
        return;
      }

      if (error.message === 'SAME_PASSWORD') {
        res.status(400).json({
          success: false,
          code: 'SAME_PASSWORD',
          message: 'Your new password must be different from your current password.',
        });
        return;
      }

      if (error.message === 'ADMIN_ACCOUNT_UNAVAILABLE') {
        res.status(401).json({
          success: false,
          message: 'Your administrator account is unavailable.',
        });
        return;
      }
    }

    console.error('Administrator password change failed:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to change your password.',
    });
  }
}

export async function logoutController(
  req: Request,
  res: Response,
): Promise<void> {
  const refreshToken = req.cookies?.[COOKIE_NAME] as string | undefined;

  try {
    await logout(refreshToken);
    res.clearCookie(COOKIE_NAME, cookieOptions());

    res.json({
      success: true,
      message: 'You have been signed out.',
    });
  } catch (error) {
    console.error('Administrator logout failed:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to complete logout.',
    });
  }
}