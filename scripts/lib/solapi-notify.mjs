/**
 * Node용 솔라피 SMS (와치독 CLI). src/lib/notify/solapi.ts 와 동일 인증.
 */
import { createHmac, randomBytes } from "node:crypto";

function digits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function authHeader(apiKey, apiSecret) {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export async function notifyWatchdogSms(text) {
  const apiKey = process.env.SOLAPI_API_KEY?.trim();
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim();
  const from = process.env.SOLAPI_FROM?.trim();
  const to = process.env.WATCHDOG_ALERT_PHONE?.trim();
  if (!apiKey || !apiSecret || !from || !to) {
    return { ok: true, skipped: true, reason: "solapi_or_phone_env_missing" };
  }
  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      Authorization: authHeader(apiKey, apiSecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        to: digits(to),
        from: digits(from),
        text: `[단정샷] ${String(text).slice(0, 900)}`,
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: body.errorMessage || body.message || `http_${res.status}`,
    };
  }
  return { ok: true, groupId: body.groupId };
}
