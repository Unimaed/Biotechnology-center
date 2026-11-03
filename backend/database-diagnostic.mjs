import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

try {
  const result = await pool.query(`
    SELECT
      current_database() AS database_name,
      current_schema() AS current_schema,
      current_setting('search_path') AS search_path,
      to_regclass('admin_users') AS admin_users,
      to_regclass('public.admin_users') AS public_admin_users,
      to_regclass('schema_migrations') AS migration_table
  `);

  console.log("\nDATABASE DIAGNOSTIC:");
  console.table(result.rows);

  const tables = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
  `);

  console.log("\nDATABASE TABLES:");
  console.table(tables.rows);

} catch (error) {
  console.error("Diagnostic failed:", error.message);
} finally {
  await pool.end();
}
