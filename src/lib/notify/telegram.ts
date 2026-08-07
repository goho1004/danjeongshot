/**
 * 와치독·업무 알림 — Telegram Bot API (Hermes 통로 ✗).
 * env: TELEGRAM_BOT_TOKEN · TELEGRAM_WATCHDOG_CHAT_ID
 */
export type NotifyResult =
  | { ok: true; skipped?: false; messageId?: number }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

const lastSentAt = new Map<string, number>();
const MIN_INTERVAL_MS = 10_000;

export async function sendTelegram(opts: {
  text: string;
  chatId?: string;
  rateKey?: string;
}): Promise<NotifyResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = (opts.chatId || process.env.TELEGRAM_WATCHDOG_CHAT_ID || "").trim();
  if (!token || !chatId) {
    return { ok: true, skipped: true, reason: "telegram_env_missing" };
  }

  const rateKey = opts.rateKey || chatId;
  const now = Date.now();
  const prev = lastSentAt.get(rateKey) || 0;
  if (now - prev < MIN_INTERVAL_MS) {
    return { ok: true, skipped: true, reason: "rate_limited" };
  }

  const text = opts.text.slice(0, 3500);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.description || `http_${res.status}` };
    }
    lastSentAt.set(rateKey, now);
    return { ok: true, messageId: body.result?.message_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send_failed" };
  }
}

export async function notifyWatchdog(text: string): Promise<NotifyResult> {
  return sendTelegram({
    text: `[단정샷] ${text}`.slice(0, 3500),
    rateKey: "watchdog",
  });
}
