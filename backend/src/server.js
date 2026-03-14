require("dotenv").config()

const express = require("express")
const cors = require("cors")
const path = require("path")
const authRoutes = require("./routes/authRoutes")
const tradingRoutes = require("./routes/tradingRoutes")
const adminRoutes = require("./routes/adminRoutes")
const pool = require("./db/pool")
const { runMigrations } = require("./db/migrateCore")
const { errorHandler } = require("./services/errorHandler")
const { ensureAdminUserExists } = require("./services/authService")
const {
  corsOriginDelegate,
  requestIdMiddleware,
  securityHeadersMiddleware,
} = require("./services/requestSecurity")

const app = express()
const PORT = Number(process.env.PORT) || 4000

app.disable("x-powered-by")
app.set("trust proxy", 1)

app.use(
  cors({
    origin: corsOriginDelegate,
  })
)
app.use(express.json({ limit: "4mb" }))
app.use(requestIdMiddleware)
app.use(securityHeadersMiddleware)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")))

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "mini-trade-backend",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  })
})

app.use("/api/auth", authRoutes)
app.use("/api/trading", tradingRoutes)
app.use("/api/admin", adminRoutes)

app.use((req, res) => {
  res.status(404).json({
    error: {
      message: "Route not found",
      code: "NOT_FOUND",
      status: 404,
      requestId: req.requestId || null,
    },
  })
})

app.use(errorHandler)

async function startServer() {
  try {
    const runMigrateOnStart = process.env.RUN_MIGRATIONS_ON_START !== "false"
    if (runMigrateOnStart) {
      await runMigrations()
      console.log("Startup migrations check complete.")
    }
    await pool.query("SELECT 1")
    console.log("PostgreSQL connection established.")
    await ensureAdminUserExists()
    console.log("Admin account bootstrap checked.")
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`MiniTrade backend running on http://localhost:${PORT}`)
  })
}

startServer()
