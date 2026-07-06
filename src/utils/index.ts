export const ADMIN_IDS: number[] = (process.env.ADMIN_IDS || "")
  .split(/[\s,]+/)
  .map((v) => Number(v))
  .filter((n) => Number.isFinite(n));

export const isAdmin = (userId: number) => ADMIN_IDS.includes(Number(userId));

export const ADMIN_USERNAMES =
  process.env.ADMIN_USERNAMES?.split(",")
    .map((username) => username.trim())
    .filter(Boolean) || [];

export function escapeHtml(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const TIME_LIMIT_MINUTES = Number(process.env.TIME_LIMIT_MINUTES || 10);

export const BOT_TOKEN = process.env.BOT_TOKEN;
export const ADMIN_GROUP_ID = Number(process.env.ADMIN_GROUP_ID);
export const GROUP_ID = Number(process.env.GROUP_ID);

// Канал-«стена мемов»: @username публичного канала (или -100... для приватного).
// Пусто = фича выключена (репост не делается).
export const MEME_CHANNEL_ID = process.env.MEME_CHANNEL_ID || "";
// Тег, по которому медиа копируется в канал.
export const MEME_TAG = process.env.MEME_TAG || "#мем";
// Ссылка на канал для показа юзерам (только для публичного @username).
export const MEME_CHANNEL_LINK = MEME_CHANNEL_ID.startsWith("@")
  ? `https://t.me/${MEME_CHANNEL_ID.slice(1)}`
  : "";
