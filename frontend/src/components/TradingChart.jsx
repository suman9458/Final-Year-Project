import { CandlestickSeries, createChart } from "lightweight-charts"
import { useEffect, useRef, useState } from "react"

const TIMEFRAME_OPTIONS = ["1m", "5m", "15m", "1h", "4h", "1d"]
const CANDLE_LIMIT = 200
const DRAWINGS_STORAGE_KEY = "tradeOneChartDrawings.v1"
const DRAWING_TOOLS = {
  PAN: "pan",
  EDIT: "edit",
  TREND: "trend",
  HLINE: "hline",
  VLINE: "vline",
  RECT: "rect",
}

function createDrawingId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getDrawingsStorageMap() {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(DRAWINGS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function setDrawingsStorageMap(payload) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(payload))
}

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

function formatPrice(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "-"
  if (numeric >= 1000) return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (numeric >= 1) return numeric.toLocaleString(undefined, { maximumFractionDigits: 4 })
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

function formatPositionSize(type, quantity) {
  return `${type === "BUY" ? "+" : "-"} ${quantity}`
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

function distancePointToSegment(point, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y)
  }
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
  const projection = { x: a.x + t * dx, y: a.y + t * dy }
  return Math.hypot(point.x - projection.x, point.y - projection.y)
}

export default function TradingChart({
  pair,
  symbol,
  source = "binance",
  seedPrice = 100,
  currentPrice = 0,
  positions = [],
  onUpdatePositionRisk,
}) {
  const fullscreenHostRef = useRef(null)
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const socketRef = useRef(null)
  const priceLinesRef = useRef([])
  const [status, setStatus] = useState("loading")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timeframe, setTimeframe] = useState("1m")
  const [riskDrafts, setRiskDrafts] = useState({})
  const [riskFeedback, setRiskFeedback] = useState({})
  const [activeTool, setActiveTool] = useState(DRAWING_TOOLS.PAN)
  const [drawings, setDrawings] = useState([])
  const [pendingPoint, setPendingPoint] = useState(null)
  const [previewPoint, setPreviewPoint] = useState(null)
  const [viewportVersion, setViewportVersion] = useState(0)
  const [selectedDrawingId, setSelectedDrawingId] = useState(null)
  const [dragState, setDragState] = useState(null)
  const drawingsScopeKey = `${pair || "unknown"}::${timeframe}`

  const calculatePositionPnl = (position) => {
    const livePrice = Number(currentPrice)
    if (!Number.isFinite(livePrice)) return 0
    const diff = livePrice - Number(position.entryPrice)
    return position.type === "BUY" ? diff * Number(position.quantity) : -diff * Number(position.quantity)
  }

  const buildChartPoint = (clientX, clientY) => {
    if (!containerRef.current || !chartRef.current || !candleSeriesRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || x < 0 || y < 0 || x > rect.width || y > rect.height) return null

    const time = chartRef.current.timeScale().coordinateToTime(x)
    const price = candleSeriesRef.current.coordinateToPrice(y)
    if (time === null || price === null || Number.isNaN(price)) return null

    return { time, price }
  }

  const toX = (time) => {
    if (!chartRef.current) return null
    const x = chartRef.current.timeScale().timeToCoordinate(time)
    return isFiniteNumber(x) ? x : null
  }

  const toY = (price) => {
    if (!candleSeriesRef.current) return null
    const y = candleSeriesRef.current.priceToCoordinate(price)
    return isFiniteNumber(y) ? y : null
  }

  const toTime = (x) => {
    if (!chartRef.current) return null
    const time = chartRef.current.timeScale().coordinateToTime(x)
    return time ?? null
  }

  const toPrice = (y) => {
    if (!candleSeriesRef.current) return null
    const price = candleSeriesRef.current.coordinateToPrice(y)
    return isFiniteNumber(price) ? price : null
  }

  const moveShapeByPixels = (shape, dx, dy) => {
    if (!shape) return shape

    if (shape.type === DRAWING_TOOLS.HLINE) {
      const y = toY(shape.price)
      const movedPrice = isFiniteNumber(y) ? toPrice(y + dy) : null
      return movedPrice === null ? shape : { ...shape, price: movedPrice }
    }

    if (shape.type === DRAWING_TOOLS.VLINE) {
      const x = toX(shape.time)
      const movedTime = isFiniteNumber(x) ? toTime(x + dx) : null
      return movedTime === null ? shape : { ...shape, time: movedTime }
    }

    const movePoint = (point) => {
      const x = toX(point?.time)
      const y = toY(point?.price)
      if (!isFiniteNumber(x) || !isFiniteNumber(y)) return point
      const time = toTime(x + dx)
      const price = toPrice(y + dy)
      if (time === null || price === null) return point
      return { time, price }
    }

    return {
      ...shape,
      p1: movePoint(shape.p1),
      p2: movePoint(shape.p2),
    }
  }

  const isPointInsideRect = (point, a, b) => {
    const left = Math.min(a.x, b.x)
    const right = Math.max(a.x, b.x)
    const top = Math.min(a.y, b.y)
    const bottom = Math.max(a.y, b.y)
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
  }

  const getShapeFromClientPoint = (clientX, clientY) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const point = { x: clientX - rect.left, y: clientY - rect.top }
    const tolerance = 8

    for (let i = drawings.length - 1; i >= 0; i -= 1) {
      const shape = drawings[i]

      if (shape.type === DRAWING_TOOLS.HLINE) {
        const y = toY(shape.price)
        if (isFiniteNumber(y) && Math.abs(point.y - y) <= tolerance) return shape
        continue
      }

      if (shape.type === DRAWING_TOOLS.VLINE) {
        const x = toX(shape.time)
        if (isFiniteNumber(x) && Math.abs(point.x - x) <= tolerance) return shape
        continue
      }

      const x1 = toX(shape.p1?.time)
      const y1 = toY(shape.p1?.price)
      const x2 = toX(shape.p2?.time)
      const y2 = toY(shape.p2?.price)
      if (!isFiniteNumber(x1) || !isFiniteNumber(y1) || !isFiniteNumber(x2) || !isFiniteNumber(y2)) continue

      if (shape.type === DRAWING_TOOLS.TREND) {
        if (distancePointToSegment(point, { x: x1, y: y1 }, { x: x2, y: y2 }) <= tolerance) return shape
        continue
      }

      if (shape.type === DRAWING_TOOLS.RECT) {
        const a = { x: x1, y: y1 }
        const b = { x: x2, y: y2 }
        if (isPointInsideRect(point, a, b)) return shape
      }
    }

    return null
  }

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
        rightOffset: 6,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
        shiftVisibleRangeOnNewBar: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
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
      setViewportVersion((prev) => prev + 1)
    })
    resizeObserver.observe(container)

    const onRangeChange = () => {
      setViewportVersion((prev) => prev + 1)
    }
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange)

    return () => {
      resizeObserver.disconnect()
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange)
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setViewportVersion((prev) => prev + 1)
    }, 500)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setPendingPoint(null)
    setPreviewPoint(null)
    setSelectedDrawingId(null)
    setDragState(null)
  }, [activeTool, pair, timeframe])

  useEffect(() => {
    const storageMap = getDrawingsStorageMap()
    const scoped = storageMap[drawingsScopeKey]
    setDrawings(Array.isArray(scoped) ? scoped : [])
    setPendingPoint(null)
    setPreviewPoint(null)
    setSelectedDrawingId(null)
    setDragState(null)
  }, [drawingsScopeKey])

  useEffect(() => {
    const storageMap = getDrawingsStorageMap()
    storageMap[drawingsScopeKey] = drawings
    setDrawingsStorageMap(storageMap)
  }, [drawings, drawingsScopeKey])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedDrawingId) {
        event.preventDefault()
        setDrawings((prev) => prev.filter((item) => item.id !== selectedDrawingId))
        setSelectedDrawingId(null)
        setDragState(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedDrawingId])

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
  }, [pair, timeframe, source])

  useEffect(() => {
    setRiskDrafts((prev) => {
      const next = {}
      positions.forEach((position) => {
        next[position.id] = {
          stopLoss: position.stopLoss ?? "",
          takeProfit: position.takeProfit ?? "",
        }
      })
      return { ...prev, ...next }
    })
  }, [positions])

  useEffect(() => {
    const series = candleSeriesRef.current
    if (!series) return undefined

    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line)
      } catch {
        // noop
      }
    })
    priceLinesRef.current = []

    positions.forEach((position) => {
      const entryLine = series.createPriceLine({
        price: position.entryPrice,
        color: position.type === "BUY" ? "#22c55e" : "#ef4444",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: formatPositionSize(position.type, position.quantity),
      })
      priceLinesRef.current.push(entryLine)

      const stopLoss = Number(position.stopLoss)
      if (Number.isFinite(stopLoss) && stopLoss > 0) {
        const slLine = series.createPriceLine({
          price: stopLoss,
          color: "#f97316",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `#${position.id} SL`,
        })
        priceLinesRef.current.push(slLine)
      }

      const takeProfit = Number(position.takeProfit)
      if (Number.isFinite(takeProfit) && takeProfit > 0) {
        const tpLine = series.createPriceLine({
          price: takeProfit,
          color: "#10b981",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `#${position.id} TP`,
        })
        priceLinesRef.current.push(tpLine)
      }
    })

    return () => {
      priceLinesRef.current.forEach((line) => {
        try {
          series.removePriceLine(line)
        } catch {
          // noop
        }
      })
      priceLinesRef.current = []
    }
  }, [positions, currentPrice])

  const handleRiskFieldChange = (positionId, field, value) => {
    setRiskDrafts((prev) => ({
      ...prev,
      [positionId]: {
        ...prev[positionId],
        [field]: value,
      },
    }))
  }

  const handleSaveRisk = (positionId) => {
    if (typeof onUpdatePositionRisk !== "function") return

    const payload = riskDrafts[positionId] || {}
    const result = onUpdatePositionRisk(positionId, payload)
    setRiskFeedback((prev) => ({
      ...prev,
      [positionId]: result.ok ? "Saved" : result.error || "Unable to update risk levels.",
    }))
  }

  const handleOverlayPointerMove = (event) => {
    if (activeTool === DRAWING_TOOLS.EDIT && dragState) {
      const dx = event.clientX - dragState.lastClientX
      const dy = event.clientY - dragState.lastClientY
      if (dx === 0 && dy === 0) return

      setDrawings((prev) =>
        prev.map((shape) => (shape.id === dragState.shapeId ? moveShapeByPixels(shape, dx, dy) : shape))
      )
      setDragState((prev) => (prev ? { ...prev, lastClientX: event.clientX, lastClientY: event.clientY } : prev))
      return
    }

    if (activeTool === DRAWING_TOOLS.PAN || activeTool === DRAWING_TOOLS.EDIT || !pendingPoint) return
    const point = buildChartPoint(event.clientX, event.clientY)
    if (!point) return
    setPreviewPoint(point)
  }

  const handleOverlayPointerDown = (event) => {
    if (activeTool !== DRAWING_TOOLS.EDIT) return
    const hitShape = getShapeFromClientPoint(event.clientX, event.clientY)
    if (!hitShape) {
      setSelectedDrawingId(null)
      return
    }

    setSelectedDrawingId(hitShape.id)
    setDragState({
      shapeId: hitShape.id,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
    })
  }

  const handleOverlayPointerUp = () => {
    if (!dragState) return
    setDragState(null)
  }

  const handleOverlayClick = (event) => {
    if (activeTool === DRAWING_TOOLS.PAN || activeTool === DRAWING_TOOLS.EDIT) return
    const point = buildChartPoint(event.clientX, event.clientY)
    if (!point) return

    if (activeTool === DRAWING_TOOLS.HLINE) {
      setDrawings((prev) => [...prev, { id: createDrawingId(), type: DRAWING_TOOLS.HLINE, price: point.price }])
      return
    }

    if (activeTool === DRAWING_TOOLS.VLINE) {
      setDrawings((prev) => [...prev, { id: createDrawingId(), type: DRAWING_TOOLS.VLINE, time: point.time }])
      return
    }

    if (!pendingPoint) {
      setPendingPoint(point)
      setPreviewPoint(point)
      return
    }

    if (activeTool === DRAWING_TOOLS.TREND) {
      setDrawings((prev) => [
        ...prev,
        {
          id: createDrawingId(),
          type: DRAWING_TOOLS.TREND,
          p1: pendingPoint,
          p2: point,
        },
      ])
    } else if (activeTool === DRAWING_TOOLS.RECT) {
      setDrawings((prev) => [
        ...prev,
        {
          id: createDrawingId(),
          type: DRAWING_TOOLS.RECT,
          p1: pendingPoint,
          p2: point,
        },
      ])
    }

    setPendingPoint(null)
    setPreviewPoint(null)
  }

  const handleUndoDrawing = () => {
    setDrawings((prev) => prev.slice(0, -1))
    setPendingPoint(null)
    setPreviewPoint(null)
  }

  const handleClearDrawings = () => {
    setDrawings([])
    setPendingPoint(null)
    setPreviewPoint(null)
    setSelectedDrawingId(null)
    setDragState(null)
  }

  const handleDeleteSelectedDrawing = () => {
    if (!selectedDrawingId) return
    setDrawings((prev) => prev.filter((item) => item.id !== selectedDrawingId))
    setSelectedDrawingId(null)
    setDragState(null)
  }

  const getPreviewShape = () => {
    if (!pendingPoint || !previewPoint) return null
    if (activeTool !== DRAWING_TOOLS.TREND && activeTool !== DRAWING_TOOLS.RECT) return null
    return {
      id: "preview",
      type: activeTool,
      p1: pendingPoint,
      p2: previewPoint,
      isPreview: true,
    }
  }

  const renderShapes = [...drawings, ...(getPreviewShape() ? [getPreviewShape()] : [])]
  const overlayWidth = containerRef.current?.clientWidth || 0
  const overlayHeight = containerRef.current?.clientHeight || 0

  const renderShapeNode = (shape, idx) => {
    const isSelected = shape.id === selectedDrawingId
    const stroke = isSelected ? "#f59e0b" : shape.isPreview ? "rgba(56,189,248,0.7)" : "#38bdf8"
    const dashed = shape.isPreview ? "6 4" : undefined

    if (shape.type === DRAWING_TOOLS.HLINE) {
      const y = toY(shape.price)
      if (!isFiniteNumber(y)) return null
      return (
        <line
          key={shape.id || idx}
          x1={0}
          y1={y}
          x2={overlayWidth}
          y2={y}
          stroke={stroke}
          strokeWidth={isSelected ? "2.5" : "1.5"}
          strokeDasharray={dashed}
        />
      )
    }

    if (shape.type === DRAWING_TOOLS.VLINE) {
      const x = toX(shape.time)
      if (!isFiniteNumber(x)) return null
      return (
        <line
          key={shape.id || idx}
          x1={x}
          y1={0}
          x2={x}
          y2={overlayHeight}
          stroke={stroke}
          strokeWidth={isSelected ? "2.5" : "1.5"}
          strokeDasharray={dashed}
        />
      )
    }

    const x1 = toX(shape.p1?.time)
    const y1 = toY(shape.p1?.price)
    const x2 = toX(shape.p2?.time)
    const y2 = toY(shape.p2?.price)
    if (!isFiniteNumber(x1) || !isFiniteNumber(y1) || !isFiniteNumber(x2) || !isFiniteNumber(y2)) return null

    if (shape.type === DRAWING_TOOLS.TREND) {
      return (
        <line
          key={shape.id || idx}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={isSelected ? "3" : "2"}
          strokeDasharray={dashed}
        />
      )
    }

    if (shape.type === DRAWING_TOOLS.RECT) {
      const x = Math.min(x1, x2)
      const y = Math.min(y1, y2)
      const width = Math.abs(x2 - x1)
      const height = Math.abs(y2 - y1)
      return (
        <rect
          key={shape.id || idx}
          x={x}
          y={y}
          width={width}
          height={height}
          fill={shape.isPreview ? "rgba(56,189,248,0.08)" : "rgba(56,189,248,0.12)"}
          stroke={stroke}
          strokeWidth={isSelected ? "2.5" : "1.5"}
          strokeDasharray={dashed}
        />
      )
    }

    return null
  }

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
      <div className="flex gap-2">
        <div className="flex w-11 flex-col items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/90 p-1">
          <button
            type="button"
            onClick={() => setActiveTool(DRAWING_TOOLS.PAN)}
            title="Pan"
            aria-label="Pan Tool"
            className={`flex h-8 w-8 items-center justify-center rounded ${activeTool === DRAWING_TOOLS.PAN ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M6 4v16M4 12h16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool(DRAWING_TOOLS.EDIT)}
            title="Select / Move Drawing"
            aria-label="Select Move Tool"
            className={`flex h-8 w-8 items-center justify-center rounded ${activeTool === DRAWING_TOOLS.EDIT ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M4 20l4-1 10-10-3-3L5 16l-1 4z" />
              <path d="M14 5l3 3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool(DRAWING_TOOLS.TREND)}
            title="Trend Line"
            aria-label="Trend Line Tool"
            className={`flex h-8 w-8 items-center justify-center rounded ${activeTool === DRAWING_TOOLS.TREND ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M4 20L20 4" />
              <circle cx="4" cy="20" r="1.5" fill="currentColor" />
              <circle cx="20" cy="4" r="1.5" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool(DRAWING_TOOLS.HLINE)}
            title="Horizontal Line"
            aria-label="Horizontal Line Tool"
            className={`flex h-8 w-8 items-center justify-center rounded ${activeTool === DRAWING_TOOLS.HLINE ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M4 12h16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool(DRAWING_TOOLS.VLINE)}
            title="Vertical Line"
            aria-label="Vertical Line Tool"
            className={`flex h-8 w-8 items-center justify-center rounded ${activeTool === DRAWING_TOOLS.VLINE ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M12 4v16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool(DRAWING_TOOLS.RECT)}
            title="Rectangle"
            aria-label="Rectangle Tool"
            className={`flex h-8 w-8 items-center justify-center rounded ${activeTool === DRAWING_TOOLS.RECT ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <rect x="5" y="6" width="14" height="12" />
            </svg>
          </button>
          <div className="my-1 h-px w-full bg-slate-700" />
          <button
            type="button"
            onClick={handleUndoDrawing}
            title="Undo Last"
            aria-label="Undo Last Drawing"
            className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M9 7H4v5" />
              <path d="M4 12a8 8 0 118 8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleClearDrawings}
            title="Clear All"
            aria-label="Clear All Drawings"
            className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M5 7h14" />
              <path d="M8 7V5h8v2" />
              <path d="M9 7l1 12h4l1-12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDeleteSelectedDrawing}
            title="Delete Selected"
            aria-label="Delete Selected Drawing"
            disabled={!selectedDrawingId}
            className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-300 enabled:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="relative flex-1">
          <div
            ref={containerRef}
            className={`w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 ${
              isFullscreen ? "h-[calc(100vh-84px)]" : "h-80"
            }`}
          />
          <svg
            data-viewport-version={viewportVersion}
            viewBox={`0 0 ${overlayWidth} ${overlayHeight}`}
            className={`pointer-events-none absolute inset-0 h-full w-full ${
              activeTool === DRAWING_TOOLS.PAN ? "" : "pointer-events-auto"
            }`}
            onMouseDown={handleOverlayPointerDown}
            onMouseMove={handleOverlayPointerMove}
            onMouseUp={handleOverlayPointerUp}
            onMouseLeave={handleOverlayPointerUp}
            onClick={handleOverlayClick}
          >
            {renderShapes.map((shape, index) => renderShapeNode(shape, index))}
          </svg>
        </div>
      </div>
      {positions.length > 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-slate-300">Live Position P&L ({symbol})</span>
            <span className="text-slate-400">Price ${formatPrice(currentPrice)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {positions.map((position) => {
              return (
                <span
                  key={position.id}
                  className={`rounded-md border px-2 py-1 ${
                    position.type === "BUY"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {formatPositionSize(position.type, position.quantity)}
                </span>
              )
            })}
          </div>
        </div>
      ) : null}
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Position Risk (Chart)</h4>
        {positions.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">Open a trade on {symbol} to manage TP/SL from chart.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {positions.map((position) => (
              <div
                key={position.id}
                className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={position.type === "BUY" ? "text-emerald-300" : "text-rose-300"}>
                    #{position.id} {position.type}
                  </span>
                  <span className="text-slate-400">Entry ${formatPrice(position.entryPrice)}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={riskDrafts[position.id]?.stopLoss ?? ""}
                    onChange={(event) => handleRiskFieldChange(position.id, "stopLoss", event.target.value)}
                    placeholder="Stop Loss"
                    className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={riskDrafts[position.id]?.takeProfit ?? ""}
                    onChange={(event) => handleRiskFieldChange(position.id, "takeProfit", event.target.value)}
                    placeholder="Take Profit"
                    className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">{riskFeedback[position.id] || "Set TP/SL and click Save."}</p>
                  <button
                    type="button"
                    onClick={() => handleSaveRisk(position.id)}
                    className="rounded-md bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-500"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
