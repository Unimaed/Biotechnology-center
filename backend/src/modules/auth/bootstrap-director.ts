import 'dotenv/config';

import bcrypt from 'bcrypt';
import { pool } from '../../config/database.js';

async function bootstrapDirector(): Promise<void> {
  const firstName = process.env.BOOTSTRAP_DIRECTOR_FIRST_NAME?.trim();
  const lastName = process.env.BOOTSTRAP_DIRECTOR_LAST_NAME?.trim();
  const email = process.env.BOOTSTRAP_DIRECTOR_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_DIRECTOR_PASSWORD;

  if (!firstName || !lastName || !email || !password) {
    throw new Error(
      'Provide the Director first name, last name, email and password through temporary environment variables.',
    );
  }

  if (password.length < 12 || password.length > 200) {
    throw new Error('Director password must contain 12 to 200 characters.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid Director email address is required.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT COUNT(*)::int AS count FROM admin_users',
    );

    if (existing.rows[0].count > 0) {
      throw new Error(
        'Administrator accounts already exist. Initial bootstrap is disabled.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `INSERT INTO admin_users
        (first_name, last_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, 'centre_director', TRUE)`,
      [firstName, lastName, email, passwordHash],
    );

    await client.query('COMMIT');

    console.log('---------------------------------------');
    console.log('Centre Director account created.');
    console.log(`Director email: ${email}`);
    console.log('Role: centre_director');
    console.log('You can now sign in through the admin login.');
    console.log('---------------------------------------');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

bootstrapDirector().catch((error: unknown) => {
  console.error('Director bootstrap failed:', error);
  process.exitCode = 1;
});