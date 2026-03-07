require("dotenv").config()

const pool = require("./pool")
const { runMigrations } = require("./migrateCore")

runMigrations()
  .then(async () => {
    await pool.end()
    console.log("Migrations complete.")
  })
  .catch(async (error) => {
    const details = error?.message || String(error)
    console.error("Migration failed:", details)
    if (error?.code) {
      console.error("Error code:", error.code)
    }
    await pool.end()
    process.exit(1)
  })
