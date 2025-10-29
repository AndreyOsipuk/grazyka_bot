export const ADMIN_IDS: number[] = (process.env.ADMIN_IDS || "")
  .split(/[\s,]+/)
  .map((v) => Number(v))
  .filter((n) => Number.isFinite(n));

export const isAdmin = (userId: number) => ADMIN_IDS.includes(Number(userId));

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
