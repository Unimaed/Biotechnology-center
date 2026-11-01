import bcrypt from 'bcrypt';
import { pool } from '../../config/database.js';
import type { AdminUser } from '../auth/auth.types.js';

interface CreateAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface UpdateAdminInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
}

async function writeAudit(
  client: import('pg').PoolClient,
  adminUserId: number,
  action: string,
  entityId: number | null,
  details: Record<string, unknown>,
  ipAddress?: string,
): Promise<void> {
  await client.query(
    `INSERT INTO admin_audit_logs
      (admin_user_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, 'admin_user', $3, $4, $5)`,
    [
      adminUserId,
      action,
      entityId === null ? null : String(entityId),
      JSON.stringify(details),
      ipAddress || null,
    ],
  );
}

export async function listAdministrators() {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, role,
            is_active, must_change_password,
            last_login_at, created_at, updated_at
     FROM admin_users
     WHERE role = 'administrator'
     ORDER BY created_at DESC`,
  );

  return result.rows;
}

export async function createAdministrator(
  actorId: number,
  input: CreateAdminInput,
  ipAddress?: string,
) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const result = await client.query(
      `INSERT INTO admin_users
        (first_name, last_name, email, password_hash, role,
         is_active, must_change_password)
       VALUES ($1, $2, $3, $4, 'administrator', TRUE, TRUE)
       RETURNING id, first_name, last_name, email, role,
                 is_active, must_change_password, created_at`,
      [
        input.firstName,
        input.lastName,
        input.email.toLowerCase(),
        passwordHash,
      ],
    );

    const administrator = result.rows[0];

    await writeAudit(
      client,
      actorId,
      'administrator.created',
      administrator.id,
      { email: administrator.email },
      ipAddress,
    );

    await client.query('COMMIT');

    return administrator;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdministrator(
  actorId: number,
  targetId: number,
  input: UpdateAdminInput,
  ipAddress?: string,
) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, first_name, last_name, email, is_active
       FROM admin_users
       WHERE id = $1 AND role = 'administrator'
       FOR UPDATE`,
      [targetId],
    );

    if (existing.rowCount === 0) {
      throw new Error('ADMINISTRATOR_NOT_FOUND');
    }

    const current = existing.rows[0];

    const updated = await client.query(
      `UPDATE admin_users
       SET first_name = $1,
           last_name = $2,
           email = $3,
           is_active = $4,
           updated_at = NOW()
       WHERE id = $5 AND role = 'administrator'
       RETURNING id, first_name, last_name, email, role,
                 is_active, must_change_password,
                 last_login_at, updated_at`,
      [
        input.firstName ?? current.first_name,
        input.lastName ?? current.last_name,
        input.email?.toLowerCase() ?? current.email,
        input.isActive ?? current.is_active,
        targetId,
      ],
    );

    const administrator = updated.rows[0];

    await writeAudit(
      client,
      actorId,
      'administrator.updated',
      targetId,
      {
        changedFields: Object.keys(input),
        email: administrator.email,
        isActive: administrator.is_active,
      },
      ipAddress,
    );

    await client.query('COMMIT');

    return administrator;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function resetAdministratorPassword(
  actorId: number,
  targetId: number,
  password: string,
  ipAddress?: string,
) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, email
       FROM admin_users
       WHERE id = $1 AND role = 'administrator'
       FOR UPDATE`,
      [targetId],
    );

    if (existing.rowCount === 0) {
      throw new Error('ADMINISTRATOR_NOT_FOUND');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `UPDATE admin_users
       SET password_hash = $1,
           must_change_password = TRUE,
           updated_at = NOW()
       WHERE id = $2 AND role = 'administrator'`,
      [passwordHash, targetId],
    );

    // Revoke all existing sessions for this administrator.
    await client.query(
      `UPDATE admin_refresh_tokens
       SET revoked_at = NOW()
       WHERE admin_user_id = $1
         AND revoked_at IS NULL`,
      [targetId],
    );

    await writeAudit(
      client,
      actorId,
      'administrator.password_reset',
      targetId,
      { email: existing.rows[0].email },
      ipAddress,
    );

    await client.query('COMMIT');

    return { id: targetId, message: 'Password reset successfully.' };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listAuditLogs(limit = 100) {
  const result = await pool.query(
    `SELECT l.id, l.action, l.entity_type, l.entity_id,
            l.details, l.ip_address, l.created_at,
            u.first_name, u.last_name, u.email
     FROM admin_audit_logs l
     LEFT JOIN admin_users u ON u.id = l.admin_user_id
     ORDER BY l.created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows;
}