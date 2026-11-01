import type {
  Request,
  Response,
  NextFunction,
} from 'express';

import { pool } from '../config/database.js';

import {
  verifyAccessToken,
} from '../modules/auth/auth.service.js';

import type {
  AdminRole,
  AuthenticatedAdmin,
} from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedAdmin;
    }
  }
}

export async function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  try {
    const token = authorization.slice(7);
    const payload = verifyAccessToken(token);

    const result = await pool.query<{
      id: number;
      email: string;
      role: AdminRole;
      is_active: boolean;
      must_change_password: boolean;
    }>(
      `SELECT id, email, role, is_active, must_change_password
       FROM admin_users
       WHERE id = $1`,
      [payload.id],
    );

    const admin = result.rows[0];

    if (!admin || !admin.is_active || admin.role !== payload.role) {
      res.status(401).json({
        success: false,
        message: 'Your administrator account is inactive or unavailable.',
      });
      return;
    }

    req.auth = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      mustChangePassword: admin.must_change_password,
    };

    // A temporary-password account may only access its profile
    // and the password-change endpoint.
    const allowedDuringPasswordChange =
      (req.method === 'POST' && req.path === '/change-password') ||
      (req.method === 'GET' && req.path === '/me');

    if (
      admin.must_change_password &&
      !allowedDuringPasswordChange
    ) {
      res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You must change your temporary password before continuing.',
      });
      return;
    }

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired access token.',
    });
  }
}

export function requireRoles(...roles: AdminRole[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
}