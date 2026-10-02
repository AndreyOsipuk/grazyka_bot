import type { InlineKeyboardButton } from "telegraf/types";

// Тексты статус-сообщения автору в чате. Сообщение одно: бот отправляет его при
// подаче мема и потом редактирует по решению админа — чат не засоряется.
export const MEME_PENDING_TEXT =
  "📨 Мем ушёл на модерацию админам. Как решат - отпишусь здесь";
export const MEME_APPROVED_TEXT = "🎉 Ваш мем опубликован!";
export const MEME_REJECTED_TEXT = "😕 Ваш мем не одобрен администрацией";

// callback_data кнопок карточки: mmok/mmno _ <id мема в чате> _ <id автора> _
// <id статус-сообщения в чате>. Всё нужное для решения зашито в кнопку, поэтому
// хранить ничего не надо и рестарт бота не мешает.
export const MEME_MOD_RE = /^mm(ok|no)_(\d+)_(\d+)_(\d+)$/;

export type MemeModDecision = {
  approve: boolean;
  memeMsgId: number;
  authorId: number;
  statusMsgId: number;
};

export function parseMemeModData(data: string): MemeModDecision | null {
  const m = MEME_MOD_RE.exec(data);
  if (!m) return null;
  return {
    approve: m[1] === "ok",
    memeMsgId: Number(m[2]),
    authorId: Number(m[3]),
    statusMsgId: Number(m[4]),
  };
}

// Ссылка на сообщение в супергруппе: -1001234567890 → t.me/c/1234567890/<msg>.
// Для чатов не вида -100… ссылку не строим.
export function buildChatMessageLink(chatId: number, msgId: number): string {
  const s = String(chatId);
  if (!s.startsWith("-100")) return "";
  return `https://t.me/c/${s.slice(4)}/${msgId}`;
}

export function buildMemeModKeyboard(
  chatId: number,
  memeMsgId: number,
  authorId: number,
  statusMsgId: number,
): InlineKeyboardButton[][] {
  const ids = `${memeMsgId}_${authorId}_${statusMsgId}`;
  const rows: InlineKeyboardButton[][] = [
    [
      { text: "✅ Одобрить", callback_data: `mmok_${ids}` },
      { text: "❌ Отклонить", callback_data: `mmno_${ids}` },
    ],
  ];
  const link = buildChatMessageLink(chatId, memeMsgId);
  if (link) rows.push([{ text: "Открыть в чате", url: link }]);
  return rows;
}
