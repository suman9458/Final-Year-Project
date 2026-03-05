require("dotenv").config()

const express = require("express")
const cors = require("cors")
const authRoutes = require("./routes/authRoutes")
const pool = require("./db/pool")
const { errorHandler } = require("./services/errorHandler")

const app = express()
const PORT = Number(process.env.PORT) || 4000

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  })
)
app.use(express.json())

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "mini-trade-backend",
    timestamp: new Date().toISOString(),
  })
})

app.use("/api/auth", authRoutes)

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" })
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
