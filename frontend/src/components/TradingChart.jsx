import { CandlestickSeries, createChart } from "lightweight-charts"
import { useEffect, useRef, useState } from "react"

const CHART_INTERVAL = "1m"
const CANDLE_LIMIT = 200

async function fetchCandles(pair) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${CHART_INTERVAL}&limit=${CANDLE_LIMIT}`
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

export default function TradingChart({ pair, symbol }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const socketRef = useRef(null)
  const [status, setStatus] = useState("loading")

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
      height: 320,
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
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
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

    fetchCandles(pair)
      .then((candles) => {
        if (!isMounted || !candleSeriesRef.current) return
        candleSeriesRef.current.setData(candles)
        chartRef.current?.timeScale().fitContent()
        setStatus("live")
      })
      .catch(() => {
        if (isMounted) setStatus("error")
      })

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@kline_${CHART_INTERVAL}`)
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
  }, [pair])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{symbol} | {CHART_INTERVAL.toUpperCase()} Candles</span>
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
      </div>
      <div ref={containerRef} className="h-80 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900" />
    </div>
  )
}
