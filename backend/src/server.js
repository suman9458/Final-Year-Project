require("dotenv").config()

const express = require("express")
const cors = require("cors")
const authRoutes = require("./routes/authRoutes")
const tradingRoutes = require("./routes/tradingRoutes")
const pool = require("./db/pool")
const { errorHandler } = require("./services/errorHandler")
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
app.use(express.json())
app.use(requestIdMiddleware)
app.use(securityHeadersMiddleware)

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
    await pool.query("SELECT 1")
    console.log("PostgreSQL connection established.")
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`MiniTrade backend running on http://localhost:${PORT}`)
  })
}

startServer()
