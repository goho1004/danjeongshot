/**
 * 와치독 CLI용 Telegram (Hermes ✗ · Bot API 직접).
 */
export async function notifyWatchdogTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_WATCHDOG_CHAT_ID?.trim();
  if (!token || !chatId) {
    return { ok: true, skipped: true, reason: "telegram_env_missing" };
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `[단정샷] ${String(text).slice(0, 3400)}`,
      disable_web_page_preview: true,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) {
    return { ok: false, error: body.description || `http_${res.status}` };
  }
  return { ok: true, messageId: body.result?.message_id };
}
