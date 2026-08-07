/**
 * 솔라피 SMS — 와치독·업무폰 알림 전용.
 * CS 전용번호로는 자동 발송하지 않음 (docs/CS_CHANNEL.md).
 */
import { createHmac, randomBytes } from "crypto";

export type SendSmsResult =
  | { ok: true; skipped?: false; groupId?: string }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

function digits(phone: string): string {
  return phone.replace(/\D/g, "");
}

function authHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 간단 rate limit (프로세스 메모리) */
const lastSentAt = new Map<string, number>();
const MIN_INTERVAL_MS = 15_000;

export async function sendSms(opts: {
  to: string;
  text: string;
  rateKey?: string;
}): Promise<SendSmsResult> {
  const apiKey = process.env.SOLAPI_API_KEY?.trim();
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim();
  const from = process.env.SOLAPI_FROM?.trim();
  if (!apiKey || !apiSecret || !from) {
    return { ok: true, skipped: true, reason: "solapi_env_missing" };
  }

  const to = digits(opts.to);
  if (to.length < 10) {
    return { ok: false, error: "invalid_to" };
  }

  const rateKey = opts.rateKey || to;
  const now = Date.now();
  const prev = lastSentAt.get(rateKey) || 0;
  if (now - prev < MIN_INTERVAL_MS) {
    return { ok: true, skipped: true, reason: "rate_limited" };
  }

  const text = opts.text.slice(0, 1000);
  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        Authorization: authHeader(apiKey, apiSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          to,
          from: digits(from),
          text,
        },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      groupId?: string;
      errorCode?: string;
      errorMessage?: string;
      message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: body.errorMessage || body.message || `http_${res.status}`,
      };
    }
    lastSentAt.set(rateKey, now);
    return { ok: true, groupId: body.groupId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send_failed" };
  }
}

export async function notifyWatchdog(text: string): Promise<SendSmsResult> {
  const to = process.env.WATCHDOG_ALERT_PHONE?.trim();
  if (!to) {
    return { ok: true, skipped: true, reason: "watchdog_phone_missing" };
  }
  return sendSms({
    to,
    text: `[단정샷] ${text}`.slice(0, 1000),
    rateKey: "watchdog",
  });
}
