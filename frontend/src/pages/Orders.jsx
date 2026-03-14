import { useMemo, useState } from "react"
import { useTrading } from "../context/TradingContext"
import { uploadJournalAttachment } from "../services/tradingService"

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

function truncateText(value, maxLength = 44) {
  const text = String(value ?? "").trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}...`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Unable to read selected file."))
    reader.readAsDataURL(file)
  })
}

const MAX_JOURNAL_ATTACHMENTS = 3
const MAX_ATTACHMENT_SIZE_BYTES = 1.5 * 1024 * 1024

export default function Orders() {
  const { positions, closedPositions, getCurrentPrice, calculateRunningPnl, tradeJournal, saveTradeJournalNote } =
    useTrading()

  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sideFilter, setSideFilter] = useState("ALL")
  const [symbolQuery, setSymbolQuery] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [editingTrade, setEditingTrade] = useState(null)
  const [journalDraft, setJournalDraft] = useState("")
  const [journalMessage, setJournalMessage] = useState("")
  const [journalAttachments, setJournalAttachments] = useState([])
  const [isAttachmentLoading, setIsAttachmentLoading] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)

  const uniqueClosedTrades = useMemo(() => {
    const seenTradeIds = new Set()

    return closedPositions.filter((position) => {
      const tradeId = String(position?.id ?? "")
      if (!tradeId || seenTradeIds.has(tradeId)) return false
      seenTradeIds.add(tradeId)
      return true
    })
  }, [closedPositions])

  const closedTradeIds = useMemo(
    () => new Set(uniqueClosedTrades.map((position) => String(position.id))),
    [uniqueClosedTrades]
  )

  const openRows = useMemo(
    () =>
      positions
        .filter((position) => !closedTradeIds.has(String(position.id)))
        .map((position) => {
          const currentPrice = getCurrentPrice(position.symbol)
          const pnl = calculateRunningPnl(position)
          const operationSide = position.type === "BUY" ? "BUY" : "SELL"
          const journalEntry = tradeJournal[String(position.id)] || {}

          return {
            rowKey: `open-${position.id}`,
            tradeId: String(position.id),
            orderId: `ORD-${String(position.id).padStart(4, "0")}`,
            pair: position.symbol,
            side: operationSide,
            operationType: operationSide === "BUY" ? "Buy" : "Sell",
            executionFlow: "Open",
            quantity: position.quantity,
            entry: position.entryPrice,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
            current: currentPrice,
            pnl,
            closeReason: "-",
            status: "Open",
            createdAt: position.createdAt,
            journalNote: journalEntry.note || "",
            journalAttachments: journalEntry.attachments || [],
          }
        }),
    [calculateRunningPnl, closedTradeIds, getCurrentPrice, positions, tradeJournal]
  )

  const closedRows = useMemo(
    () =>
      uniqueClosedTrades.map((position) => {
        const originalSide = position.type === "BUY" ? "BUY" : "SELL"
        const journalEntry = tradeJournal[String(position.id)] || {}

        return {
          rowKey: `closed-${position.id}`,
          tradeId: String(position.id),
          orderId: `ORD-${String(position.id).padStart(4, "0")}`,
          pair: position.symbol,
          side: originalSide,
          operationType: originalSide === "BUY" ? "Buy" : "Sell",
          executionFlow: "Complete",
          quantity: position.quantity,
          entry: position.entryPrice,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          current: position.closePrice,
          pnl: position.closedPnl,
          closeReason: position.closeReason || "Manual Close",
          status: "Closed",
          createdAt: position.closedAt,
          journalNote: journalEntry.note || "",
          journalAttachments: journalEntry.attachments || [],
        }
      }),
    [tradeJournal, uniqueClosedTrades]
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

  const handleExportCsv = () => {
    if (filteredRows.length === 0) return

    const headers = [
      "Order ID",
      "Pair",
      "Side",
      "Operation Type",
      "Execution Flow",
      "Qty",
      "Entry",
      "SL",
      "TP",
      "Current/Close",
      "PnL",
      "Status",
      "Close Reason",
      "Journal Note",
      "Attachment Count",
      "Timestamp",
    ]

    const lines = [headers.join(",")]
    filteredRows.forEach((row) => {
      const cells = [
        row.orderId,
        row.pair,
        row.side,
        row.operationType,
        row.executionFlow,
        row.quantity,
        row.entry,
        row.stopLoss ?? "",
        row.takeProfit ?? "",
        row.current,
        row.pnl,
        row.status,
        row.closeReason,
        row.journalNote,
        row.journalAttachments.length,
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

  const handleOpenJournal = (row) => {
    setEditingTrade({
      tradeId: row.tradeId,
      orderId: row.orderId,
      pair: row.pair,
      status: row.status,
    })
    setJournalDraft(row.journalNote || "")
    setJournalAttachments(row.journalAttachments || [])
    setJournalMessage("")
  }

  const closeJournalModal = () => {
    setEditingTrade(null)
    setJournalDraft("")
    setJournalAttachments([])
    setJournalMessage("")
  }

  const handleSaveJournal = () => {
    if (!editingTrade) return

    const result = saveTradeJournalNote(editingTrade.tradeId, {
      note: journalDraft,
      attachments: journalAttachments,
    })
    if (!result?.ok) {
      setJournalMessage(result?.error || "Unable to save journal note.")
      return
    }

    setJournalMessage("Journal note saved.")
    setTimeout(() => {
      closeJournalModal()
    }, 500)
  }

  const handleJournalFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""
    if (files.length === 0) return

    if (journalAttachments.length >= MAX_JOURNAL_ATTACHMENTS) {
      setJournalMessage(`You can keep up to ${MAX_JOURNAL_ATTACHMENTS} screenshots per trade.`)
      return
    }

    setIsAttachmentLoading(true)
    try {
      const remainingSlots = MAX_JOURNAL_ATTACHMENTS - journalAttachments.length
      const nextFiles = files.slice(0, remainingSlots)
      const prepared = []

      for (const file of nextFiles) {
        if (!String(file.type || "").startsWith("image/")) {
          setJournalMessage("Only image files are supported for journal attachments.")
          continue
        }
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          setJournalMessage("Each screenshot must be 1.5 MB or smaller.")
          continue
        }

        const dataUrl = await readFileAsDataUrl(file)

        try {
          const uploadedAttachment = await uploadJournalAttachment({
            fileName: file.name,
            contentType: file.type || "image/png",
            dataUrl,
          })
          if (uploadedAttachment) {
            prepared.push(uploadedAttachment)
            continue
          }
        } catch (error) {
          if (error.code !== "LOCAL_SESSION") {
            setJournalMessage("Backend upload unavailable. Keeping screenshot in local journal mode.")
          }
        }

        prepared.push({
          id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type || "image/*",
          dataUrl,
        })
      }

      if (prepared.length > 0) {
        setJournalAttachments((prev) => [...prev, ...prepared].slice(0, MAX_JOURNAL_ATTACHMENTS))
        if (!journalMessage || journalMessage.includes("saved")) {
          setJournalMessage("")
        }
      }
    } catch (error) {
      setJournalMessage(error.message || "Unable to add selected screenshot.")
    } finally {
      setIsAttachmentLoading(false)
    }
  }

  const removeJournalAttachment = (attachmentId) => {
    setJournalAttachments((prev) => prev.filter((item) => item.id !== attachmentId))
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
          <p className="text-xs text-slate-400">Realized Profit</p>
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
            placeholder="Search symbol"
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
            Filtered Trades: <span className="font-semibold text-slate-100">{filteredRows.length}</span>
          </p>
          <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            Running:{" "}
            <span
              className={`font-semibold ${
                filteredRows.filter((row) => row.status === "Open").reduce((sum, row) => sum + row.pnl, 0) >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              $
              {filteredRows
                .filter((row) => row.status === "Open")
                .reduce((sum, row) => sum + row.pnl, 0)
                .toFixed(2)}
            </span>
          </p>
          <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            Realized:{" "}
            <span
              className={`font-semibold ${
                filteredRows.filter((row) => row.status === "Closed").reduce((sum, row) => sum + row.pnl, 0) >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              $
              {filteredRows
                .filter((row) => row.status === "Closed")
                .reduce((sum, row) => sum + row.pnl, 0)
                .toFixed(2)}
            </span>
          </p>
          <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            Total:{" "}
            <span
              className={`font-semibold ${
                filteredRows.reduce((sum, row) => sum + row.pnl, 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              ${filteredRows.reduce((sum, row) => sum + row.pnl, 0).toFixed(2)}
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
                  <th className="px-2 py-2">Operation</th>
                  <th className="px-2 py-2">Execution</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Entry</th>
                  <th className="px-2 py-2">SL</th>
                  <th className="px-2 py-2">TP</th>
                  <th className="px-2 py-2">Current/Close</th>
                  <th className="px-2 py-2">P&L</th>
                  <th className="px-2 py-2">Reason</th>
                  <th className="px-2 py-2">Journal</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.rowKey} className="border-t border-slate-700 text-slate-200">
                    <td className="px-2 py-2">{row.orderId}</td>
                    <td className="px-2 py-2">{row.pair}</td>
                    <td className={`px-2 py-2 ${row.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>{row.side}</td>
                    <td className="px-2 py-2 text-slate-300">{row.operationType}</td>
                    <td className="px-2 py-2 text-slate-300">{row.executionFlow}</td>
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
                      <button
                        type="button"
                        onClick={() => handleOpenJournal(row)}
                        className="max-w-40 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-left text-xs text-slate-300 hover:bg-slate-800/80"
                      >
                        {row.journalNote
                          ? truncateText(row.journalNote)
                          : row.journalAttachments.length > 0
                            ? `${row.journalAttachments.length} screenshot(s)`
                            : "Add note"}
                      </button>
                    </td>
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

      {editingTrade ? (
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="app-surface soft-in w-full max-w-lg rounded-xl p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Trade Journal</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{editingTrade.orderId}</h2>
                <p className="text-sm text-slate-300">
                  {editingTrade.pair} | {editingTrade.status}
                </p>
              </div>
              <button
                type="button"
                onClick={closeJournalModal}
                className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <textarea
              value={journalDraft}
              onChange={(event) => {
                setJournalDraft(event.target.value)
                if (journalMessage) setJournalMessage("")
              }}
              rows={6}
              placeholder="Write your trade setup, reason, emotion, or lesson here..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
            />
            <p className="mt-2 text-xs text-slate-400">
              Saving an empty note with no attachments will remove the journal entry for this trade.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Screenshots / Attachments</p>
                  <p className="text-xs text-slate-400">
                    Up to {MAX_JOURNAL_ATTACHMENTS} images, 1.5 MB each.
                  </p>
                </div>
                <label className="cursor-pointer rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">
                  {isAttachmentLoading ? "Adding..." : "Add Screenshot"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleJournalFiles}
                    className="hidden"
                    disabled={isAttachmentLoading || journalAttachments.length >= MAX_JOURNAL_ATTACHMENTS}
                  />
                </label>
              </div>

              {journalAttachments.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {journalAttachments.map((attachment) => (
                    <div key={attachment.id} className="theme-soft-block rounded-lg p-2">
                      <img
                        src={attachment.dataUrl}
                        alt={attachment.name}
                        className="h-32 w-full cursor-zoom-in rounded-md object-cover"
                        onClick={() => setPreviewAttachment(attachment)}
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-slate-300">{attachment.name}</p>
                        <button
                          type="button"
                          onClick={() => removeJournalAttachment(attachment.id)}
                          className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="theme-soft-block rounded-lg px-3 py-4 text-sm text-slate-400">
                  No screenshots attached yet.
                </div>
              )}
            </div>

            {journalMessage ? <p className="mt-3 text-sm text-emerald-400">{journalMessage}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeJournalModal}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveJournal}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewAttachment ? (
        <div className="fixed inset-0 z-130 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" onClick={() => setPreviewAttachment(null)}>
          <div
            className="relative max-h-[92vh] w-full max-w-5xl rounded-xl bg-slate-950/95 p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">{previewAttachment.name}</p>
                <p className="text-xs text-slate-400">Full-screen journal preview</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto rounded-lg bg-slate-900/80 p-2">
              <img
                src={previewAttachment.dataUrl}
                alt={previewAttachment.name}
                className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
