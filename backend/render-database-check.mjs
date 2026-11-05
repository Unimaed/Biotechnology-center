import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

try {
  const tables = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
  `);

  console.log('RENDER DATABASE TABLES:');
  console.table(tables.rows);

  const history = await pool.query(`
    SELECT to_regclass('public.schema_migrations') AS migration_table
  `);

  console.log('MIGRATION TABLE:', history.rows[0]);

  if (history.rows[0].migration_table) {
    const migrations = await pool.query(
      'SELECT filename, applied_at FROM public.schema_migrations ORDER BY filename'
    );

    console.log('MIGRATION HISTORY:');
    console.table(migrations.rows);
  }
} catch (error) {
  console.error('Database check failed:', error.message);
} finally {
  await pool.end();
}