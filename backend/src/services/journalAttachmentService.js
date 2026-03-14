const fs = require("fs/promises")
const path = require("path")
const crypto = require("crypto")

const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads", "journal")
const PUBLIC_PREFIX = "/uploads/journal"
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"])

function createHttpError(status, message, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function getExtension(contentType) {
  if (contentType === "image/png") return ".png"
  if (contentType === "image/webp") return ".webp"
  return ".jpg"
}

function decodeDataUrl(dataUrl, contentType) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    throw createHttpError(400, "Invalid image payload.", "VALIDATION_ERROR")
  }

  const actualType = String(match[1] || "").toLowerCase()
  if (actualType !== contentType) {
    throw createHttpError(400, "Image content type mismatch.", "VALIDATION_ERROR")
  }

  let buffer
  try {
    buffer = Buffer.from(match[2], "base64")
  } catch {
    throw createHttpError(400, "Unable to decode image payload.", "VALIDATION_ERROR")
  }

  if (!buffer || buffer.length === 0) {
    throw createHttpError(400, "Uploaded image is empty.", "VALIDATION_ERROR")
  }

  return buffer
}

async function saveJournalAttachment({ userId, fileName, contentType, dataUrl }) {
  const normalizedType = String(contentType || "").trim().toLowerCase()
  if (!ALLOWED_TYPES.has(normalizedType)) {
    throw createHttpError(400, "Unsupported image type.", "VALIDATION_ERROR")
  }

  const buffer = decodeDataUrl(dataUrl, normalizedType)
  if (buffer.length > 2 * 1024 * 1024) {
    throw createHttpError(413, "Image must be 2 MB or smaller.", "PAYLOAD_TOO_LARGE")
  }

  const safeUserId = String(userId || "").replace(/[^a-zA-Z0-9_-]/g, "")
  const safeName = path.basename(String(fileName || "attachment").replace(/\s+/g, "-"))
  const uniqueId = crypto.randomUUID()
  const ext = getExtension(normalizedType)

  const userDir = path.join(UPLOAD_ROOT, safeUserId)
  await fs.mkdir(userDir, { recursive: true })

  const storedFileName = `${uniqueId}${ext}`
  const storedPath = path.join(userDir, storedFileName)
  await fs.writeFile(storedPath, buffer)

  return {
    id: `ATT-${uniqueId}`,
    name: safeName || `attachment${ext}`,
    type: normalizedType,
    path: `${PUBLIC_PREFIX}/${safeUserId}/${storedFileName}`,
    uploadedAt: new Date().toISOString(),
  }
}

module.exports = {
  saveJournalAttachment,
}
