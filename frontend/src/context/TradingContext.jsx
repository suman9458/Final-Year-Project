/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { fetchTradingState, saveTradingState } from "../services/tradingService"

const TradingContext = createContext(null)

const initialMarkets = [
  { symbol: "BTC / USDT", pair: "BTCUSDT", price: 50000, source: "binance" },
  { symbol: "ETH / USDT", pair: "ETHUSDT", price: 3200, source: "binance" },
  { symbol: "SOL / USDT", pair: "SOLUSDT", price: 180, source: "binance" },
  { symbol: "BNB / USDT", pair: "BNBUSDT", price: 620, source: "binance" },
  { symbol: "GOLD / USDT", pair: "PAXGUSDT", price: 5000, source: "binance" },
  { symbol: "SILVER / USD", pair: "XAGUSD_DEMO", price: 24.5, source: "demo" },
]
const INITIAL_DEMO_BALANCE = 10000
const TRADING_STORAGE_KEY = "miniTradeTradingState.v1"
const DEMO_LEVERAGE = 5
const MAX_RISK_PER_TRADE_PCT = 0.02

function formatTxnId(txnNumber) {
  return `TXN-${String(txnNumber).padStart(4, "0")}`
}

function parseTxnNumber(txnId) {
  const match = String(txnId || "").match(/^TXN-(\d+)$/)
  return match ? Number(match[1]) : NaN
}

function createInitialDepositTransaction() {
  return {
    id: formatTxnId(1001),
    type: "Deposit",
    amount: INITIAL_DEMO_BALANCE,
    status: "Completed",
    createdAt: new Date().toISOString(),
    note: "Initial demo balance",
  }
}

function parseAlertNumber(alertId) {
  const match = String(alertId || "").match(/^ALT-(\d+)$/)
  return match ? Number(match[1]) : NaN
}

function formatAlertId(alertNumber) {
  return `ALT-${String(alertNumber).padStart(4, "0")}`
}

function normalizeTradingState(rawState) {
  const parsed = rawState && typeof rawState === "object" ? rawState : {}
  return {
    selectedPair: typeof parsed?.selectedPair === "string" ? parsed.selectedPair : null,
    positions: Array.isArray(parsed?.positions) ? parsed.positions : [],
    closedPositions: Array.isArray(parsed?.closedPositions) ? parsed.closedPositions : [],
    demoBalance: Number.isFinite(parsed?.demoBalance) ? Number(parsed.demoBalance) : INITIAL_DEMO_BALANCE,
    walletTransactions: Array.isArray(parsed?.walletTransactions) ? parsed.walletTransactions : [],
    priceAlerts: Array.isArray(parsed?.priceAlerts) ? parsed.priceAlerts : [],
  }
}

function readPersistedTradingState() {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(TRADING_STORAGE_KEY)
    if (!raw) return null

    return normalizeTradingState(JSON.parse(raw))
  } catch {
    return null
  }
}

function getNextPositionId(positions, closedPositions) {
  const ids = [...positions, ...closedPositions].map((item) => Number(item?.id)).filter((id) => Number.isFinite(id))
  return ids.length > 0 ? Math.max(...ids) + 1 : 1
}

function getNextTransactionNumber(transactions) {
  const numbers = transactions.map((item) => parseTxnNumber(item?.id)).filter((value) => Number.isFinite(value))
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1002
}

function getNextAlertNumber(alerts) {
  const numbers = alerts.map((item) => parseAlertNumber(item?.id)).filter((value) => Number.isFinite(value))
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1
}

function formatAlertPrice(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "-"
  if (numeric >= 1000) return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (numeric >= 1) return numeric.toLocaleString(undefined, { maximumFractionDigits: 4 })
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

export function TradingProvider({ children }) {
  const persistedStateRef = useRef(readPersistedTradingState())
  const persistedState = persistedStateRef.current

  const [markets, setMarkets] = useState(initialMarkets)
  const [selectedPair, setSelectedPair] = useState(() => persistedState?.selectedPair || initialMarkets[0].pair)
  const [marketConnectionStatus, setMarketConnectionStatus] = useState("connecting")
  const [positions, setPositions] = useState(() => persistedState?.positions || [])
  const [closedPositions, setClosedPositions] = useState(() => persistedState?.closedPositions || [])
  const [demoBalance, setDemoBalance] = useState(() => persistedState?.demoBalance ?? INITIAL_DEMO_BALANCE)
  const [walletTransactions, setWalletTransactions] = useState(() => {
    if (persistedState?.walletTransactions && persistedState.walletTransactions.length > 0) {
      return persistedState.walletTransactions
    }
    return [createInitialDepositTransaction()]
  })
  const [priceAlerts, setPriceAlerts] = useState(() => persistedState?.priceAlerts || [])
  const [alertNotifications, setAlertNotifications] = useState([])
  const reconnectTimerRef = useRef(null)
  const closingPositionIdsRef = useRef(new Set())
  const nextPositionIdRef = useRef(getNextPositionId(persistedState?.positions || [], persistedState?.closedPositions || []))
  const nextTransactionIdRef = useRef(getNextTransactionNumber(persistedState?.walletTransactions || []))
  const nextAlertIdRef = useRef(getNextAlertNumber(persistedState?.priceAlerts || []))
  const remoteSyncReadyRef = useRef(false)
  const remoteSyncTimerRef = useRef(null)
  const seenTriggeredAlertsRef = useRef(new Map())

  useEffect(() => {
    let isCancelled = false

    async function hydrateFromServer() {
      try {
        const serverState = await fetchTradingState()
        if (isCancelled || !serverState) return

        const normalized = normalizeTradingState(serverState)
        const hasSelectedPair = initialMarkets.some((market) => market.pair === normalized.selectedPair)
        const safeSelectedPair = hasSelectedPair ? normalized.selectedPair : initialMarkets[0].pair
        const safeWalletTxns =
          normalized.walletTransactions.length > 0 ? normalized.walletTransactions : [createInitialDepositTransaction()]

        setSelectedPair(safeSelectedPair)
        setPositions(normalized.positions)
        setClosedPositions(normalized.closedPositions)
        setDemoBalance(normalized.demoBalance)
        setWalletTransactions(safeWalletTxns)
        setPriceAlerts(normalized.priceAlerts)
        nextPositionIdRef.current = getNextPositionId(normalized.positions, normalized.closedPositions)
        nextTransactionIdRef.current = getNextTransactionNumber(safeWalletTxns)
        nextAlertIdRef.current = getNextAlertNumber(normalized.priceAlerts)
      } catch {
        // Keep local mode state when API is unavailable.
      } finally {
        if (!isCancelled) {
          remoteSyncReadyRef.current = true
        }
      }
    }

    hydrateFromServer()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const payload = {
      selectedPair,
      positions,
      closedPositions,
      demoBalance,
      walletTransactions,
      priceAlerts,
    }
    window.localStorage.setItem(TRADING_STORAGE_KEY, JSON.stringify(payload))

    if (!remoteSyncReadyRef.current) return
    if (remoteSyncTimerRef.current) clearTimeout(remoteSyncTimerRef.current)

    remoteSyncTimerRef.current = setTimeout(() => {
      saveTradingState(payload).catch(() => {
        // Ignore sync failures and keep local mode working.
      })
    }, 700)

    return () => {
      if (remoteSyncTimerRef.current) clearTimeout(remoteSyncTimerRef.current)
    }
  }, [selectedPair, positions, closedPositions, demoBalance, walletTransactions, priceAlerts])

  useEffect(() => {
    let socket
    let isMounted = true

    const connect = () => {
      const binancePairs = initialMarkets.filter((market) => market.source === "binance").map((market) => market.pair)
      const streams = binancePairs.map((pair) => `${pair.toLowerCase()}@ticker`).join("/")
      if (!streams) return

      socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)

      socket.onopen = () => {
        if (isMounted) setMarketConnectionStatus("connected")
      }

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        const pair = message?.data?.s
        const livePrice = Number(message?.data?.c)
        if (!pair || !Number.isFinite(livePrice)) return

        setMarkets((prev) => prev.map((market) => (market.pair === pair ? { ...market, price: livePrice } : market)))
      }

      socket.onerror = () => {
        if (isMounted) setMarketConnectionStatus("reconnecting")
      }

      socket.onclose = () => {
        if (!isMounted) return
        setMarketConnectionStatus("reconnecting")
        reconnectTimerRef.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close()
      }
    }
  }, [])

  useEffect(() => {
    if (markets.length === 0 || priceAlerts.length === 0) return

    setPriceAlerts((prev) => {
      let changed = false

      const next = prev.map((alert) => {
        if (!alert?.isActive || alert?.triggeredAt) return alert
        const market = markets.find((item) => item.pair === alert.pair)
        if (!market) return alert

        const livePrice = Number(market.price)
        const targetPrice = Number(alert.targetPrice)
        if (!Number.isFinite(livePrice) || !Number.isFinite(targetPrice)) return alert

        const isTriggered =
          alert.direction === "below" ? livePrice <= targetPrice : livePrice >= targetPrice

        if (!isTriggered) return alert
        changed = true
        return {
          ...alert,
          isActive: false,
          triggeredAt: new Date().toISOString(),
        }
      })

      return changed ? next : prev
    })
  }, [markets, priceAlerts])

  useEffect(() => {
    const nextSeen = new Map()
    const newNotifications = []

    priceAlerts.forEach((alert) => {
      if (!alert?.triggeredAt) return
      const key = String(alert.id)
      const triggerMark = String(alert.triggeredAt)
      nextSeen.set(key, triggerMark)

      const seenMark = seenTriggeredAlertsRef.current.get(key)
      if (seenMark === triggerMark) return

      newNotifications.push({
        id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        alertId: alert.id,
        symbol: alert.symbol,
        message: `${alert.symbol} ${alert.direction === "above" ? "crossed above" : "dropped below"} ${formatAlertPrice(
          alert.targetPrice
        )}`,
        createdAt: new Date().toISOString(),
      })
    })

    seenTriggeredAlertsRef.current = nextSeen
    if (newNotifications.length === 0) return

    setAlertNotifications((prev) => [...newNotifications, ...prev].slice(0, 5))

    if (typeof window !== "undefined") {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (!AudioCtx) return
        const audioCtx = new AudioCtx()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        oscillator.type = "sine"
        oscillator.frequency.value = 880
        gainNode.gain.value = 0.04
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.15)
      } catch {
        // ignore sound errors
      }
    }
  }, [priceAlerts])

  useEffect(() => {
    if (alertNotifications.length === 0) return undefined
    const timer = setInterval(() => {
      const now = Date.now()
      setAlertNotifications((prev) =>
        prev.filter((item) => now - new Date(item.createdAt).getTime() < 6000)
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [alertNotifications])

  useEffect(() => {
    const demoPairs = initialMarkets.filter((market) => market.source === "demo").map((market) => market.pair)
    if (demoPairs.length === 0) return undefined

    const timer = setInterval(() => {
      setMarkets((prev) =>
        prev.map((market) => {
          if (!demoPairs.includes(market.pair)) return market

          const drift = (Math.random() - 0.5) * 0.05
          const nextPrice = Math.max(0.01, market.price + drift)
          return { ...market, price: Number(nextPrice.toFixed(4)) }
        })
      )
    }, 2000)

    return () => clearInterval(timer)
  }, [])

  const selectedMarket = useMemo(
    () => markets.find((market) => market.pair === selectedPair) ?? markets[0],
    [markets, selectedPair]
  )

  const totalUsedMargin = useMemo(
    () =>
      positions.reduce((sum, position) => {
        const required = Number(position.requiredMargin)
        if (Number.isFinite(required) && required > 0) return sum + required
        const fallback = (Number(position.entryPrice) * Number(position.quantity)) / DEMO_LEVERAGE
        return sum + (Number.isFinite(fallback) && fallback > 0 ? fallback : 0)
      }, 0),
    [positions]
  )

  const freeMargin = useMemo(() => Math.max(0, demoBalance - totalUsedMargin), [demoBalance, totalUsedMargin])
  const maxRiskPerTradeAmount = useMemo(() => Math.max(0, demoBalance * MAX_RISK_PER_TRADE_PCT), [demoBalance])

  const placeOrder = useCallback((order) => {
    const entryPrice = Number(order?.entryPrice)
    const quantity = Number(order?.quantity)
    const stopLoss = order?.stopLoss === null || order?.stopLoss === undefined ? null : Number(order?.stopLoss)
    const side = String(order?.type || "")
    if (!Number.isFinite(entryPrice) || !Number.isFinite(quantity) || entryPrice <= 0 || quantity <= 0) {
      return { ok: false, error: "Invalid order values." }
    }

    const requiredMargin = (entryPrice * quantity) / DEMO_LEVERAGE
    if (!Number.isFinite(requiredMargin) || requiredMargin <= 0) {
      return { ok: false, error: "Unable to calculate required margin." }
    }
    if (requiredMargin > freeMargin) {
      return {
        ok: false,
        error: `Insufficient free margin. Required $${requiredMargin.toFixed(2)}, available $${freeMargin.toFixed(2)}.`,
      }
    }

    if (stopLoss !== null && Number.isFinite(stopLoss) && stopLoss > 0) {
      const riskPerUnit = Math.abs(entryPrice - stopLoss)
      const potentialLoss = riskPerUnit * quantity
      if (riskPerUnit <= 0) {
        return { ok: false, error: "Invalid Stop Loss for risk calculation." }
      }
      if (potentialLoss > maxRiskPerTradeAmount) {
        const maxQty = maxRiskPerTradeAmount / riskPerUnit
        return {
          ok: false,
          error: `Risk exceeds 2% rule. Max qty for this SL is ${maxQty.toFixed(4)} (${side || "ORDER"}).`,
        }
      }
    }

    const newId = nextPositionIdRef.current
    nextPositionIdRef.current += 1

    setPositions((prev) => [
      {
        id: newId,
        ...order,
        requiredMargin,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
    return { ok: true, error: null }
  }, [freeMargin, maxRiskPerTradeAmount])

  const setSelectedMarket = useCallback((market) => {
    if (!market) return
    if (typeof market === "string") {
      setSelectedPair(market)
      return
    }
    setSelectedPair(market.pair)
  }, [])

  const getCurrentPrice = useCallback(
    (symbol) => {
      const market = markets.find((item) => item.symbol === symbol)
      return market ? market.price : 0
    },
    [markets]
  )

  const calculateRunningPnl = useCallback(
    (position) => {
      const currentPrice = getCurrentPrice(position.symbol)
      const diff = currentPrice - position.entryPrice
      return position.type === "BUY" ? diff * position.quantity : -diff * position.quantity
    },
    [getCurrentPrice]
  )

  const totalRunningPnl = useMemo(
    () => positions.reduce((sum, position) => sum + calculateRunningPnl(position), 0),
    [calculateRunningPnl, positions]
  )

  const accountEquity = useMemo(() => demoBalance + totalRunningPnl, [demoBalance, totalRunningPnl])

  const closePosition = useCallback(
    (positionId, options = {}) => {
      if (closingPositionIdsRef.current.has(positionId)) return
      closingPositionIdsRef.current.add(positionId)

      setPositions((prev) => {
        const positionToClose = prev.find((position) => position.id === positionId)
        if (!positionToClose) {
          closingPositionIdsRef.current.delete(positionId)
          return prev
        }

        const closeReason = options.reason || "Manual Close"
        const overrideClosePrice = Number(options.closePrice)
        const closePrice = Number.isFinite(overrideClosePrice) ? overrideClosePrice : getCurrentPrice(positionToClose.symbol)
        const priceDiff = closePrice - positionToClose.entryPrice
        const rawClosedPnl =
          positionToClose.type === "BUY"
            ? priceDiff * positionToClose.quantity
            : -priceDiff * positionToClose.quantity

        setDemoBalance((balancePrev) => {
          // Keep demo cash non-negative: apply loss only up to available cash.
          const appliedPnl = Math.max(rawClosedPnl, -balancePrev)
          const nextBalance = Math.max(0, balancePrev + appliedPnl)

          setClosedPositions((closedPrev) => [
            {
              ...positionToClose,
              closePrice,
              closedPnl: appliedPnl,
              closeReason,
              closedAt: new Date().toISOString(),
            },
            ...closedPrev,
          ])
          setWalletTransactions((txnPrev) => {
            const txnId = formatTxnId(nextTransactionIdRef.current)
            nextTransactionIdRef.current += 1

            return [
              {
                id: txnId,
                type: "Trade P&L",
                amount: appliedPnl,
                status: "Completed",
                createdAt: new Date().toISOString(),
                note: `${positionToClose.symbol} ${positionToClose.type} (${closeReason})`,
              },
              ...txnPrev,
            ]
          })

          return nextBalance
        })
        closingPositionIdsRef.current.delete(positionId)

        return prev.filter((position) => position.id !== positionId)
      })
    },
    [getCurrentPrice]
  )

  const updatePositionRisk = useCallback((positionId, payload) => {
    const parseLevel = (value) => {
      if (value === null || value === undefined || value === "") return null
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric > 0 ? numeric : NaN
    }

    let result = { ok: false, error: "Position not found." }

    setPositions((prev) => {
      const position = prev.find((item) => item.id === positionId)
      if (!position) return prev

      const stopLoss = parseLevel(payload?.stopLoss)
      const takeProfit = parseLevel(payload?.takeProfit)

      if (Number.isNaN(stopLoss)) {
        result = { ok: false, error: "Stop Loss must be a valid positive value." }
        return prev
      }
      if (Number.isNaN(takeProfit)) {
        result = { ok: false, error: "Take Profit must be a valid positive value." }
        return prev
      }

      if (position.type === "BUY") {
        if (stopLoss !== null && stopLoss >= position.entryPrice) {
          result = { ok: false, error: "For BUY, Stop Loss must be below entry price." }
          return prev
        }
        if (takeProfit !== null && takeProfit <= position.entryPrice) {
          result = { ok: false, error: "For BUY, Take Profit must be above entry price." }
          return prev
        }
      } else {
        if (stopLoss !== null && stopLoss <= position.entryPrice) {
          result = { ok: false, error: "For SELL, Stop Loss must be above entry price." }
          return prev
        }
        if (takeProfit !== null && takeProfit >= position.entryPrice) {
          result = { ok: false, error: "For SELL, Take Profit must be below entry price." }
          return prev
        }
      }

      result = { ok: true, error: null }
      return prev.map((item) =>
        item.id === positionId
          ? {
              ...item,
              stopLoss,
              takeProfit,
            }
          : item
      )
    })

    return result
  }, [])

  useEffect(() => {
    if (positions.length === 0) return

    const triggerClosures = []
    const shouldStopOut = accountEquity <= 0

    for (const position of positions) {
      const currentPrice = getCurrentPrice(position.symbol)

      if (shouldStopOut) {
        triggerClosures.push({ id: position.id, reason: "Stop Out", closePrice: currentPrice })
        continue
      }

      const stopLoss = Number(position.stopLoss)
      const takeProfit = Number(position.takeProfit)
      const hasSl = Number.isFinite(stopLoss) && stopLoss > 0
      const hasTp = Number.isFinite(takeProfit) && takeProfit > 0

      if (position.type === "BUY") {
        if (hasSl && currentPrice <= stopLoss) {
          triggerClosures.push({ id: position.id, reason: "Stop Loss Hit", closePrice: currentPrice })
          continue
        }
        if (hasTp && currentPrice >= takeProfit) {
          triggerClosures.push({ id: position.id, reason: "Take Profit Hit", closePrice: currentPrice })
        }
      } else if (position.type === "SELL") {
        if (hasSl && currentPrice >= stopLoss) {
          triggerClosures.push({ id: position.id, reason: "Stop Loss Hit", closePrice: currentPrice })
          continue
        }
        if (hasTp && currentPrice <= takeProfit) {
          triggerClosures.push({ id: position.id, reason: "Take Profit Hit", closePrice: currentPrice })
        }
      }
    }

    if (triggerClosures.length > 0) {
      triggerClosures.forEach((item) => {
        closePosition(item.id, { reason: item.reason, closePrice: item.closePrice })
      })
    }
  }, [accountEquity, closePosition, getCurrentPrice, positions])

  const addDemoFunds = useCallback((amount = 1000) => {
    const safeAmount = Number(amount)
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) return

    setDemoBalance((balancePrev) => balancePrev + safeAmount)
    setWalletTransactions((txnPrev) => {
      const txnId = formatTxnId(nextTransactionIdRef.current)
      nextTransactionIdRef.current += 1

      return [
        {
          id: txnId,
          type: "Deposit",
          amount: safeAmount,
          status: "Completed",
          createdAt: new Date().toISOString(),
          note: "Manual demo top-up",
        },
        ...txnPrev,
      ]
    })
  }, [])

  const withdrawDemoFunds = useCallback((amount = 500) => {
    const safeAmount = Number(amount)
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) return false

    let isWithdrawn = false

    setDemoBalance((balancePrev) => {
      if (balancePrev < safeAmount) return balancePrev
      isWithdrawn = true
      return balancePrev - safeAmount
    })

    if (!isWithdrawn) return false

    setWalletTransactions((txnPrev) => {
      const txnId = formatTxnId(nextTransactionIdRef.current)
      nextTransactionIdRef.current += 1

      return [
        {
          id: txnId,
          type: "Withdrawal",
          amount: -safeAmount,
          status: "Completed",
          createdAt: new Date().toISOString(),
          note: "Manual demo withdrawal",
        },
        ...txnPrev,
      ]
    })

    return true
  }, [])

  const resetDemoAccount = useCallback(() => {
    closingPositionIdsRef.current.clear()
    nextPositionIdRef.current = 1
    nextTransactionIdRef.current = 1002
    setPositions([])
    setClosedPositions([])
    setDemoBalance(INITIAL_DEMO_BALANCE)
    setWalletTransactions([createInitialDepositTransaction()])
  }, [])

  const createPriceAlert = useCallback((payload) => {
    const pair = String(payload?.pair || "").trim()
    const symbol = String(payload?.symbol || "").trim()
    const direction = payload?.direction === "below" ? "below" : "above"
    const targetPrice = Number(payload?.targetPrice)
    if (!pair || !symbol || !Number.isFinite(targetPrice) || targetPrice <= 0) {
      return { ok: false, error: "Invalid alert values." }
    }

    const alertId = formatAlertId(nextAlertIdRef.current)
    nextAlertIdRef.current += 1
    setPriceAlerts((prev) => [
      {
        id: alertId,
        pair,
        symbol,
        direction,
        targetPrice,
        isActive: true,
        triggeredAt: null,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
    return { ok: true, error: null }
  }, [])

  const removePriceAlert = useCallback((alertId) => {
    setPriceAlerts((prev) => prev.filter((item) => item.id !== alertId))
  }, [])

  const reactivatePriceAlert = useCallback((alertId) => {
    setPriceAlerts((prev) =>
      prev.map((item) =>
        item.id === alertId
          ? {
              ...item,
              isActive: true,
              triggeredAt: null,
            }
          : item
      )
    )
  }, [])

  const dismissAlertNotification = useCallback((notificationId) => {
    setAlertNotifications((prev) => prev.filter((item) => item.id !== notificationId))
  }, [])

  const value = useMemo(
    () => ({
      markets,
      selectedMarket,
      setSelectedMarket,
      marketConnectionStatus,
      demoBalance,
      totalRunningPnl,
      accountEquity,
      totalUsedMargin,
      freeMargin,
      maxRiskPerTradeAmount,
      walletTransactions,
      priceAlerts,
      positions,
      closedPositions,
      placeOrder,
      closePosition,
      updatePositionRisk,
      addDemoFunds,
      withdrawDemoFunds,
      resetDemoAccount,
      createPriceAlert,
      removePriceAlert,
      reactivatePriceAlert,
      alertNotifications,
      dismissAlertNotification,
      getCurrentPrice,
      calculateRunningPnl,
    }),
    [
      addDemoFunds,
      calculateRunningPnl,
      closePosition,
      closedPositions,
      accountEquity,
      demoBalance,
      getCurrentPrice,
      marketConnectionStatus,
      markets,
      placeOrder,
      positions,
      selectedMarket,
      setSelectedMarket,
      totalRunningPnl,
      totalUsedMargin,
      freeMargin,
      maxRiskPerTradeAmount,
      updatePositionRisk,
      walletTransactions,
      priceAlerts,
      withdrawDemoFunds,
      resetDemoAccount,
      createPriceAlert,
      removePriceAlert,
      reactivatePriceAlert,
      alertNotifications,
      dismissAlertNotification,
    ]
  )

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>
}

export function useTrading() {
  const context = useContext(TradingContext)
  if (!context) {
    throw new Error("useTrading must be used inside TradingProvider")
  }
  return context
}
