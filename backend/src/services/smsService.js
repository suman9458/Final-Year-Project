const twilio = require("twilio")

function isTwilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  )
}

async function sendOtpSms(phone, otp) {
  if (!isTwilioConfigured()) {
    return { mode: "demo" }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

  const client = twilio(accountSid, authToken)
  const body = `Your MiniTrade OTP is ${otp}. It expires in 10 minutes.`

  try {
    const message = await client.messages.create({
      to: phone,
      body,
      ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
    })
    return {
      mode: "twilio",
      sid: message.sid,
    }
  } catch (error) {
    const err = new Error(error?.message || "Failed to send SMS via Twilio.")
    err.status = 502
    throw err
  }
}

module.exports = {
  sendOtpSms,
  isTwilioConfigured,
}
