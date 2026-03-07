const fs = require("node:fs/promises")
const path = require("node:path")
const pool = require("./pool")

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

async function getAppliedMigrations() {
  const result = await pool.query("SELECT filename FROM schema_migrations")
  return new Set(result.rows.map((row) => row.filename))
}

async function runMigrations() {
  const migrationDir = path.join(__dirname, "migrations")
  const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort()

  await ensureMigrationTable()
  const applied = await getAppliedMigrations()

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping migration: ${file}`)
      continue
    }

    const sql = await fs.readFile(path.join(migrationDir, file), "utf8")
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      await client.query(sql)
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
      console.log(`Applied migration: ${file}`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }
}

module.exports = {
  runMigrations,
}

