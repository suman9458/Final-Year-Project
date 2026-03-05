import { CandlestickSeries, createChart } from "lightweight-charts"
import { useEffect, useRef, useState } from "react"

const TIMEFRAME_OPTIONS = ["1m", "5m", "15m", "1h", "4h", "1d"]
const CANDLE_LIMIT = 200

function getIntervalSeconds(interval) {
  const mapping = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
  }
  return mapping[interval] || 60
}

async function fetchCandles(pair, interval) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${CANDLE_LIMIT}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error("Failed to load chart history.")
  }

  const raw = await response.json()
  return raw.map((candle) => ({
    time: Math.floor(candle[0] / 1000),
    open: Number(candle[1]),
    high: Number(candle[2]),
    low: Number(candle[3]),
    close: Number(candle[4]),
  }))
}

function generateDemoCandles(basePrice, interval, count = CANDLE_LIMIT) {
  const intervalSeconds = getIntervalSeconds(interval)
  const now = Math.floor(Date.now() / 1000)
  const candles = []
  let lastClose = Number(basePrice) || 24.5

  for (let i = count - 1; i >= 0; i -= 1) {
    const time = now - i * intervalSeconds
    const open = lastClose
    const volatility = Math.max(0.002, open * 0.002)
    const close = Math.max(0.01, open + (Math.random() - 0.5) * volatility)
    const high = Math.max(open, close) + Math.random() * volatility * 0.4
    const low = Math.min(open, close) - Math.random() * volatility * 0.4

    candles.push({
      time,
      open: Number(open.toFixed(4)),
      high: Number(Math.max(0.01, high).toFixed(4)),
      low: Number(Math.max(0.01, low).toFixed(4)),
      close: Number(close.toFixed(4)),
    })
    lastClose = close
  }

  return candles
}

export default function TradingChart({ pair, symbol, source = "binance", seedPrice = 100 }) {
  const fullscreenHostRef = useRef(null)
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const socketRef = useRef(null)
  const [status, setStatus] = useState("loading")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timeframe, setTimeframe] = useState("1m")

  const handleToggleFullscreen = async () => {
    const host = fullscreenHostRef.current
    if (!host) return

    try {
      if (document.fullscreenElement === host) {
        await document.exitFullscreen()
        return
      }
      await host.requestFullscreen()
    } catch {
      setStatus("error")
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const host = fullscreenHostRef.current
      const active = document.fullscreenElement === host
      setIsFullscreen(active)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    setStatus("loading")

    const chartOptions = {
      layout: {
        background: { color: "#0b1635" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.12)" },
        horzLines: { color: "rgba(148,163,184,0.12)" },
      },
      width: container.clientWidth,
      height: container.clientHeight || 320,
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      crosshair: {
        vertLine: {
          color: "rgba(56,189,248,0.5)",
        },
        horzLine: {
          color: "rgba(56,189,248,0.5)",
        },
      },
    }

    const seriesOptions = {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    }

    let chart
    let candleSeries

    try {
      chart = createChart(container, chartOptions)
      if (typeof chart.addCandlestickSeries === "function") {
        candleSeries = chart.addCandlestickSeries(seriesOptions)
      } else {
        candleSeries = chart.addSeries(CandlestickSeries, seriesOptions)
      }
    } catch {
      setStatus("error")
      return undefined
    }

    chartRef.current = chart
    candleSeriesRef.current = candleSeries

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 320,
      })
      chartRef.current.timeScale().fitContent()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!pair || !candleSeriesRef.current) return undefined

    let isMounted = true
    setStatus("loading")

    if (source === "demo") {
      const intervalSeconds = getIntervalSeconds(timeframe)
      const demoCandles = generateDemoCandles(seedPrice, timeframe)
      candleSeriesRef.current.setData(demoCandles)
      chartRef.current?.timeScale().fitContent()
      setStatus("live")

      const timer = setInterval(() => {
        if (!candleSeriesRef.current) return
        const last = demoCandles[demoCandles.length - 1]
        const now = Math.floor(Date.now() / 1000)
        const currentCandleTime = now - (now % intervalSeconds)
        const volatility = Math.max(0.002, last.close * 0.002)
        const nextPrice = Math.max(0.01, last.close + (Math.random() - 0.5) * volatility)

        if (currentCandleTime === last.time) {
          const updated = {
            ...last,
            high: Number(Math.max(last.high, nextPrice).toFixed(4)),
            low: Number(Math.min(last.low, nextPrice).toFixed(4)),
            close: Number(nextPrice.toFixed(4)),
          }
          demoCandles[demoCandles.length - 1] = updated
          candleSeriesRef.current.update(updated)
          return
        }

        const nextCandle = {
          time: currentCandleTime,
          open: Number(last.close.toFixed(4)),
          high: Number(Math.max(last.close, nextPrice).toFixed(4)),
          low: Number(Math.min(last.close, nextPrice).toFixed(4)),
          close: Number(nextPrice.toFixed(4)),
        }
        demoCandles.push(nextCandle)
        if (demoCandles.length > CANDLE_LIMIT) {
          demoCandles.shift()
          candleSeriesRef.current.setData(demoCandles)
        } else {
          candleSeriesRef.current.update(nextCandle)
        }
      }, 1200)

      return () => {
        isMounted = false
        clearInterval(timer)
      }
    }

    fetchCandles(pair, timeframe)
      .then((candles) => {
        if (!isMounted || !candleSeriesRef.current) return
        candleSeriesRef.current.setData(candles)
        chartRef.current?.timeScale().fitContent()
        setStatus("live")
      })
      .catch(() => {
        if (isMounted) setStatus("error")
      })

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@kline_${timeframe}`)
    socketRef.current = ws

    ws.onopen = () => {
      if (isMounted) setStatus("live")
    }

    ws.onmessage = (event) => {
      if (!candleSeriesRef.current) return
      const message = JSON.parse(event.data)
      const kline = message?.k
      if (!kline) return

      candleSeriesRef.current.update({
        time: Math.floor(kline.t / 1000),
        open: Number(kline.o),
        high: Number(kline.h),
        low: Number(kline.l),
        close: Number(kline.c),
      })
    }

    ws.onerror = () => {
      if (isMounted) setStatus("error")
    }

    ws.onclose = () => {
      if (isMounted) setStatus("disconnected")
    }

    return () => {
      isMounted = false
      if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        socketRef.current.close()
      }
      socketRef.current = null
    }
  }, [pair, timeframe, source, seedPrice])

  return (
    <div
      ref={fullscreenHostRef}
      className={`space-y-2 ${isFullscreen ? "h-full w-full bg-slate-950 p-4" : ""}`}
    >
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>{symbol}</span>
          <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 p-1">
            {TIMEFRAME_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTimeframe(item)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase transition ${
                  timeframe === item ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wider ${
              status === "live"
                ? "bg-emerald-500/20 text-emerald-300"
                : status === "loading"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-rose-500/20 text-rose-300"
            }`}
          >
            {status}
          </span>
          <button
            type="button"
            aria-label={isFullscreen ? "Exit fullscreen chart" : "Enter fullscreen chart"}
            onClick={handleToggleFullscreen}
            className="rounded-md border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800"
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                <path d="M9 15H5v4M15 9h4V5M15 15h4v4M9 9H5V5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                <path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className={`w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 ${
          isFullscreen ? "h-[calc(100vh-84px)]" : "h-80"
        }`}
      />
    </div>
  )
}
