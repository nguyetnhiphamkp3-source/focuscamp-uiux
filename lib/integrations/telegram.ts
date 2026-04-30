/**
 * Telegram bot message delivery via sendMessage API.
 */
import { logger } from "@/lib/logger";

export interface TelegramMessage {
  text: string;
  url?: string;
  parseMode?: "HTML" | "MarkdownV2";
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: TelegramMessage
): Promise<boolean> {
  try {
    const params: Record<string, unknown> = {
      chat_id: chatId,
      text: message.text.slice(0, 4096),
      disable_web_page_preview: true,
    };
    if (message.parseMode) params.parse_mode = message.parseMode;
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params),
      }
    );
    if (!res.ok) {
      logger.warn(
        { status: res.status, body: await res.text().catch(() => "") },
        "[telegram] sendMessage non-200"
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err }, "[telegram] fetch failed");
    return false;
  }
}
