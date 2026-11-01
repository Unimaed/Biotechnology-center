import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
import { pool } from '../config/database.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const migrationsDirectory = path.join(
  currentDirectory,
  'migrations',
);

async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await fs.readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const existing = await client.query(
        'SELECT id FROM schema_migrations WHERE filename = $1',
        [filename],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`Already applied: ${filename}`);
        continue;
      }

      const sql = await fs.readFile(
        path.join(migrationsDirectory, filename),
        'utf8',
      );

      console.log(`Applying: ${filename}`);

      await client.query('BEGIN');

      try {
        await client.query(sql);

        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename],
        );

        await client.query('COMMIT');

        console.log(`Successfully applied: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('Database migrations completed.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});