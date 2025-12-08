import type { Context } from "telegraf";

import { ADMIN_GROUP_ID, escapeHtml, GROUP_ID, isAdmin } from "./index";

// Разрешённые админские команды
const MODERATION_COMMAND_RE = /^!(warn|mute|unmute|ban|unban|kick|restrict)\b/i;

export const logCombotModeration = async (ctx: Context) => {
  const chat = ctx.chat;
  const from = ctx.from;

  if (!chat || chat.id !== GROUP_ID) return;
  if (!from) return;

  // Нужны только админы
  if (!isAdmin(from.id)) return;

  const msg: any = ctx.message;
  if (!msg) return;

  const text: string | undefined =
    ("text" in msg && msg.text) ||
    ("caption" in msg && msg.caption) ||
    undefined;

  if (!text) return;

  const trimmed = text.trim();

  // Проверяем, что это модераторская команда
  const cmdMatch = trimmed.match(MODERATION_COMMAND_RE);
  if (!cmdMatch) return;

  const command = cmdMatch[0]; // например "!warn"

  // 🎯 Определяем, на кого была команда:
  let targetMention = "— неизвестно —";
  let targetId: number | undefined;

  // 1) Если команда в ответ на сообщение → это лучший вариант
  if (msg.reply_to_message?.from) {
    const t = msg.reply_to_message.from;
    targetId = t.id;
    targetMention = t.username
      ? `@${t.username}`
      : `<a href="tg://user?id=${t.id}">${escapeHtml(t.first_name || "user")}</a>`;
  }

  // 2) Если команда через @username (!warn @androsible)
  if (!targetId) {
    const m = trimmed.match(/@([a-zA-Z0-9_]+)/);
    if (m) {
      targetMention = `@${m[1]}`;
    }
  }

  // 📝 Формируем красивый лог в админский чат
  const adminMention = from.username
    ? `@${from.username}`
    : `<a href="tg://user?id=${from.id}">${escapeHtml(from.first_name)}</a>`;

  const formatted = [
    `🛡 <b>Админское действие</b>`,
    `👮 Админ: ${adminMention}`,
    `💬 Команда: <code>${escapeHtml(command)}</code>`,
    `🎯 Цель: ${targetMention}`,
    "",
  ].join("\n");

  await ctx.telegram.sendMessage(ADMIN_GROUP_ID, formatted, {
    parse_mode: "HTML",
  });
};
