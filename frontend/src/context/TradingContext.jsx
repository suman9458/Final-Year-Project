import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

const TradingContext = createContext(null)

const initialMarkets = [
  { symbol: "BTC / USDT", pair: "BTCUSDT", price: 50000 },
  { symbol: "ETH / USDT", pair: "ETHUSDT", price: 3200 },
  { symbol: "SOL / USDT", pair: "SOLUSDT", price: 180 },
  { symbol: "BNB / USDT", pair: "BNBUSDT", price: 620 },
]
const INITIAL_DEMO_BALANCE = 10000

function formatTxnId(txnNumber) {
  return `TXN-${String(txnNumber).padStart(4, "0")}`
}

export function TradingProvider({ children }) {
  const [markets, setMarkets] = useState(initialMarkets)
  const [selectedPair, setSelectedPair] = useState(initialMarkets[0].pair)
  const [marketConnectionStatus, setMarketConnectionStatus] = useState("connecting")
  const [positions, setPositions] = useState([])
  const [closedPositions, setClosedPositions] = useState([])
  const [demoBalance, setDemoBalance] = useState(INITIAL_DEMO_BALANCE)
  const [walletTransactions, setWalletTransactions] = useState([
    {
      id: formatTxnId(1001),
      type: "Deposit",
      amount: INITIAL_DEMO_BALANCE,
      status: "Completed",
      createdAt: new Date().toISOString(),
      note: "Initial demo balance",
    },
  ])
  const reconnectTimerRef = useRef(null)
  const nextPositionIdRef = useRef(1)
  const nextTransactionIdRef = useRef(1002)

  useEffect(() => {
    let socket
    let isMounted = true

    const connect = () => {
      const streams = initialMarkets.map((market) => `${market.pair.toLowerCase()}@ticker`).join("/")
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

  const selectedMarket = useMemo(
    () => markets.find((market) => market.pair === selectedPair) ?? markets[0],
    [markets, selectedPair]
  )

  const placeOrder = useCallback((order) => {
    const newId = nextPositionIdRef.current
    nextPositionIdRef.current += 1

    setPositions((prev) => [
      {
        id: newId,
        ...order,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
  }, [])

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
      setPositions((prev) => {
        const positionToClose = prev.find((position) => position.id === positionId)
        if (!positionToClose) return prev

        const closeReason = options.reason || "Manual Close"
        const overrideClosePrice = Number(options.closePrice)
        const closePrice = Number.isFinite(overrideClosePrice) ? overrideClosePrice : getCurrentPrice(positionToClose.symbol)
        const priceDiff = closePrice - positionToClose.entryPrice
        const closedPnl =
          positionToClose.type === "BUY"
            ? priceDiff * positionToClose.quantity
            : -priceDiff * positionToClose.quantity

        setClosedPositions((closedPrev) => [
          {
            ...positionToClose,
            closePrice,
            closedPnl,
            closeReason,
            closedAt: new Date().toISOString(),
          },
          ...closedPrev,
        ])
        setDemoBalance((balancePrev) => balancePrev + closedPnl)
        setWalletTransactions((txnPrev) => {
          const txnId = formatTxnId(nextTransactionIdRef.current)
          nextTransactionIdRef.current += 1

          return [
            {
              id: txnId,
              type: "Trade P&L",
              amount: closedPnl,
              status: "Completed",
              createdAt: new Date().toISOString(),
              note: `${positionToClose.symbol} ${positionToClose.type} (${closeReason})`,
            },
            ...txnPrev,
          ]
        })

        return prev.filter((position) => position.id !== positionId)
      })
    },
    [getCurrentPrice]
  )

  useEffect(() => {
    if (positions.length === 0) return

    const triggerClosures = []
    for (const position of positions) {
      const currentPrice = getCurrentPrice(position.symbol)
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
  }, [closePosition, getCurrentPrice, positions])

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

  const value = useMemo(
    () => ({
      markets,
      selectedMarket,
      setSelectedMarket,
      marketConnectionStatus,
      demoBalance,
      totalRunningPnl,
      accountEquity,
      walletTransactions,
      positions,
      closedPositions,
      placeOrder,
      closePosition,
      addDemoFunds,
      withdrawDemoFunds,
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
      walletTransactions,
      withdrawDemoFunds,
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
