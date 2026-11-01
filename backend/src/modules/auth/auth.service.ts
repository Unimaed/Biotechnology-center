
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

import { pool } from '../../config/database.js';

import type {
  AdminRole,
  AdminUser,
} from './auth.types.js';

const ACCESS_TOKEN_LIFETIME = '15m';
const REFRESH_TOKEN_DAYS = 7;
const BCRYPT_ROUNDS = 12;

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
  }

  return secret;
}

function createAccessToken(admin: AdminUser): string {
  return jwt.sign(
    { role: admin.role },
    getAccessSecret(),
    {
      subject: String(admin.id),
      expiresIn: ACCESS_TOKEN_LIFETIME,
    },
  );
}

function createRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_DAYS);
  return expiry;
}

function publicAdmin(admin: AdminUser) {
  return {
    id: admin.id,
    firstName: admin.first_name,
    lastName: admin.last_name,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.must_change_password,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<{
  admin: ReturnType<typeof publicAdmin>;
  accessToken: string;
  refreshToken: string;
}> {
  const result = await pool.query<AdminUser & { password_hash: string }>(
    `SELECT id, first_name, last_name, email, password_hash,
            role, is_active, must_change_password
     FROM admin_users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email],
  );

  const admin = result.rows[0];

  if (!admin || !admin.is_active) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(
    password,
    admin.password_hash,
  );

  if (!passwordMatches) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const refreshToken = createRefreshToken();

  await pool.query(
    `INSERT INTO admin_refresh_tokens
       (admin_user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [
      admin.id,
      hashRefreshToken(refreshToken),
      refreshExpiry(),
    ],
  );

  await pool.query(
    'UPDATE admin_users SET last_login_at = NOW() WHERE id = $1',
    [admin.id],
  );

  return {
    admin: publicAdmin(admin),
    accessToken: createAccessToken(admin),
    refreshToken,
  };
}

export async function refreshSession(
  oldToken: string,
): Promise<{
  admin: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: AdminRole;
    mustChangePassword: boolean;
  };
  accessToken: string;
  refreshToken: string;
}> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query<{
      id: number;
      admin_user_id: number;
      expires_at: Date;
      revoked_at: Date | null;
      first_name: string;
      last_name: string;
      email: string;
      role: AdminRole;
      is_active: boolean;
      must_change_password: boolean;
    }>(
      `SELECT rt.id, rt.admin_user_id, rt.expires_at, rt.revoked_at,
              u.first_name, u.last_name, u.email, u.role,
              u.is_active, u.must_change_password
       FROM admin_refresh_tokens rt
       JOIN admin_users u ON u.id = rt.admin_user_id
       WHERE rt.token_hash = $1
       FOR UPDATE OF rt`,
      [hashRefreshToken(oldToken)],
    );

    const session = result.rows[0];

    if (
      !session ||
      session.revoked_at ||
      new Date(session.expires_at).getTime() <= Date.now() ||
      !session.is_active
    ) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    await client.query(
      `UPDATE admin_refresh_tokens
       SET revoked_at = NOW()
       WHERE id = $1`,
      [session.id],
    );

    const admin: AdminUser = {
      id: session.admin_user_id,
      first_name: session.first_name,
      last_name: session.last_name,
      email: session.email,
      role: session.role,
      is_active: session.is_active,
      must_change_password: session.must_change_password,
    };

    const refreshToken = createRefreshToken();

    await client.query(
      `INSERT INTO admin_refresh_tokens
         (admin_user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [
        admin.id,
        hashRefreshToken(refreshToken),
        refreshExpiry(),
      ],
    );

    await client.query('COMMIT');

    return {
      admin: publicAdmin(admin),
      accessToken: createAccessToken(admin),
      refreshToken,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function changeAdminPassword(
  adminId: number,
  currentPassword: string,
  newPassword: string,
  currentRefreshToken?: string,
  ipAddress?: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query<{
      id: number;
      password_hash: string;
      is_active: boolean;
    }>(
      `SELECT id, password_hash, is_active
       FROM admin_users
       WHERE id = $1
       FOR UPDATE`,
      [adminId],
    );

    const admin = result.rows[0];

    if (!admin || !admin.is_active) {
      throw new Error('ADMIN_ACCOUNT_UNAVAILABLE');
    }

    const currentMatches = await bcrypt.compare(
      currentPassword,
      admin.password_hash,
    );

    if (!currentMatches) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      admin.password_hash,
    );

    if (samePassword) {
      throw new Error('SAME_PASSWORD');
    }

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      BCRYPT_ROUNDS,
    );

    await client.query(
      `UPDATE admin_users
       SET password_hash = $1,
           must_change_password = FALSE,
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, adminId],
    );

    // Keep this browser's refresh session and revoke the others.
    const currentTokenHash = currentRefreshToken
      ? hashRefreshToken(currentRefreshToken)
      : null;

    await client.query(
      `UPDATE admin_refresh_tokens
       SET revoked_at = NOW()
       WHERE admin_user_id = $1
         AND revoked_at IS NULL
         AND ($2::text IS NULL OR token_hash <> $2)`,
      [adminId, currentTokenHash],
    );

    await client.query(
      `INSERT INTO admin_audit_logs
         (admin_user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        adminId,
        'ADMIN_PASSWORD_CHANGED',
        'admin_user',
        String(adminId),
        JSON.stringify({
          passwordChanged: true,
          otherSessionsRevoked: true,
        }),
        ipAddress || null,
      ],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function logout(refreshToken?: string): Promise<void> {
  if (!refreshToken) return;

  await pool.query(
    `UPDATE admin_refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1
       AND revoked_at IS NULL`,
    [hashRefreshToken(refreshToken)],
  );
}

export function verifyAccessToken(token: string): {
  id: number;
  role: AdminRole;
} {
  const decoded = jwt.verify(token, getAccessSecret());

  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('INVALID_ACCESS_TOKEN');
  }

  const role = decoded.role;

  if (role !== 'centre_director' && role !== 'administrator') {
    throw new Error('INVALID_ACCESS_TOKEN');
  }

  const id = Number(decoded.sub);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('INVALID_ACCESS_TOKEN');
  }

  return { id, role };
}
