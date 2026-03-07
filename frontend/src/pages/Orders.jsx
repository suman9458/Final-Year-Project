import { useMemo, useState } from "react"
import { useTrading } from "../context/TradingContext"

function formatPrice(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "-"
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function escapeCsvCell(value) {
  const text = String(value ?? "")
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export default function Orders() {
  const { positions, closedPositions, getCurrentPrice, calculateRunningPnl } = useTrading()
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sideFilter, setSideFilter] = useState("ALL")
  const [symbolQuery, setSymbolQuery] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const openRows = useMemo(
    () =>
      positions.map((position) => {
        const currentPrice = getCurrentPrice(position.symbol)
        const pnl = calculateRunningPnl(position)

        return {
          rowKey: `open-${position.id}`,
          orderId: `ORD-${String(position.id).padStart(4, "0")}`,
          pair: position.symbol,
          side: position.type,
          quantity: position.quantity,
          entry: position.entryPrice,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          current: currentPrice,
          pnl,
          closeReason: "-",
          status: "Open",
          createdAt: position.createdAt,
        }
      }),
    [calculateRunningPnl, getCurrentPrice, positions]
  )

  const closedRows = useMemo(
    () =>
      closedPositions.map((position) => ({
        rowKey: `closed-${position.id}-${position.closedAt}`,
        orderId: `ORD-${String(position.id).padStart(4, "0")}`,
        pair: position.symbol,
        side: position.type,
        quantity: position.quantity,
        entry: position.entryPrice,
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        current: position.closePrice,
        pnl: position.closedPnl,
        closeReason: position.closeReason || "Manual Close",
        status: "Closed",
        createdAt: position.closedAt,
      })),
    [closedPositions]
  )

  const rows = useMemo(() => [...openRows, ...closedRows], [closedRows, openRows])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false
      if (sideFilter !== "ALL" && row.side !== sideFilter) return false
      if (symbolQuery.trim() && !row.pair.toLowerCase().includes(symbolQuery.trim().toLowerCase())) return false
      if (fromDate || toDate) {
        if (!row.createdAt) return false
        const rowDate = new Date(row.createdAt)
        if (Number.isNaN(rowDate.getTime())) return false

        if (fromDate) {
          const from = new Date(`${fromDate}T00:00:00`)
          if (rowDate < from) return false
        }
        if (toDate) {
          const to = new Date(`${toDate}T23:59:59.999`)
          if (rowDate > to) return false
        }
      }
      return true
    })
  }, [fromDate, rows, sideFilter, statusFilter, symbolQuery, toDate])

  const stats = useMemo(() => {
    const realized = closedRows.reduce((sum, row) => sum + row.pnl, 0)
    const winTrades = closedRows.filter((row) => row.pnl > 0).length
    const winRate = closedRows.length > 0 ? (winTrades / closedRows.length) * 100 : 0

    return {
      openCount: openRows.length,
      closedCount: closedRows.length,
      realizedPnl: realized,
      winRate,
    }
  }, [closedRows, openRows.length])

  const filteredStats = useMemo(() => {
    const filteredOpen = filteredRows.filter((row) => row.status === "Open")
    const filteredClosed = filteredRows.filter((row) => row.status === "Closed")
    const running = filteredOpen.reduce((sum, row) => sum + row.pnl, 0)
    const realized = filteredClosed.reduce((sum, row) => sum + row.pnl, 0)
    return {
      count: filteredRows.length,
      running,
      realized,
      total: running + realized,
    }
  }, [filteredRows])

  const handleExportCsv = () => {
    if (filteredRows.length === 0) return

    const headers = [
      "Order ID",
      "Pair",
      "Side",
      "Qty",
      "Entry",
      "SL",
      "TP",
      "Current/Close",
      "PnL",
      "Reason",
      "Status",
      "Timestamp",
    ]

    const lines = [headers.join(",")]
    filteredRows.forEach((row) => {
      const cells = [
        row.orderId,
        row.pair,
        row.side,
        row.quantity,
        row.entry,
        row.stopLoss ?? "",
        row.takeProfit ?? "",
        row.current,
        row.pnl,
        row.closeReason,
        row.status,
        row.createdAt ?? "",
      ].map(escapeCsvCell)
      lines.push(cells.join(","))
    })

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `tradeone-orders-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <section className="app-surface soft-in rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Orders</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Order History</h1>
        <p className="mt-1 text-sm text-slate-300">Open and closed demo positions with filters.</p>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Open Positions</p>
          <p className="mt-2 text-2xl font-bold text-sky-300">{stats.openCount}</p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Closed Trades</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">{stats.closedCount}</p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Realized P&L</p>
          <p className={`mt-2 text-2xl font-bold ${stats.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${stats.realizedPnl.toFixed(2)}
          </p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Win Rate</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">{stats.winRate.toFixed(1)}%</p>
        </article>
      </section>

      <section className="app-surface soft-in space-y-3 rounded-xl p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="ALL">All Status</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            value={sideFilter}
            onChange={(event) => setSideFilter(event.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="ALL">All Side</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <input
            value={symbolQuery}
            onChange={(event) => setSymbolQuery(event.target.value)}
            placeholder="Search symbol (BTC, GOLD...)"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            Filtered Trades: <span className="font-semibold text-slate-100">{filteredStats.count}</span>
          </p>
          <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            Running:{" "}
            <span className={`font-semibold ${filteredStats.running >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ${filteredStats.running.toFixed(2)}
            </span>
          </p>
          <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            Realized:{" "}
            <span className={`font-semibold ${filteredStats.realized >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ${filteredStats.realized.toFixed(2)}
            </span>
          </p>
          <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            Total:{" "}
            <span className={`font-semibold ${filteredStats.total >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ${filteredStats.total.toFixed(2)}
            </span>
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">No orders available. Place orders from Trading page.</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-slate-400">No rows match current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">Order ID</th>
                  <th className="px-2 py-2">Pair</th>
                  <th className="px-2 py-2">Side</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Entry</th>
                  <th className="px-2 py-2">SL</th>
                  <th className="px-2 py-2">TP</th>
                  <th className="px-2 py-2">Current/Close</th>
                  <th className="px-2 py-2">P&L</th>
                  <th className="px-2 py-2">Reason</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.rowKey} className="border-t border-slate-700 text-slate-200">
                    <td className="px-2 py-2">{row.orderId}</td>
                    <td className="px-2 py-2">{row.pair}</td>
                    <td className={`px-2 py-2 ${row.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>{row.side}</td>
                    <td className="px-2 py-2">{row.quantity}</td>
                    <td className="px-2 py-2">${formatPrice(row.entry)}</td>
                    <td className="px-2 py-2">{row.stopLoss ? `$${formatPrice(row.stopLoss)}` : "-"}</td>
                    <td className="px-2 py-2">{row.takeProfit ? `$${formatPrice(row.takeProfit)}` : "-"}</td>
                    <td className="px-2 py-2">${formatPrice(row.current)}</td>
                    <td className={`px-2 py-2 font-semibold ${row.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      ${row.pnl.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-slate-300">{row.closeReason}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          row.status === "Open" ? "bg-sky-500/20 text-sky-300" : "bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
