// src/handlers/reportClaim.ts
import type { Context } from "telegraf";

import { ADMIN_GROUP_ID, escapeHtml, isAdmin } from "./index";

export const reportClaim = async (ctx: Context) => {
  const from = ctx.from;
  const chat = ctx.chat;

  if (!from || !chat) return;

  // Только из админского чата
  if (chat.id !== ADMIN_GROUP_ID) {
    return ctx.answerCbQuery?.("Не здесь 🙂", { show_alert: false });
  }

  // Только админы
  if (!isAdmin(from.id)) {
    return ctx.answerCbQuery?.("❌ Только админы могут брать репорты", {
      show_alert: true,
    });
  }

  const cb = ctx.callbackQuery;
  if (!cb || !("message" in cb) || !cb.message) return;

  const msg: any = cb.message;
  const originalText: string = msg.text ?? msg.caption ?? "";

  // Если уже кто-то занимается — не дублируем
  if (originalText.includes("👨‍💻 Сейчас занимается")) {
    await ctx.answerCbQuery?.("Репорт уже кто-то взял", {
      show_alert: false,
    });
    return;
  }

  const adminLabel = from.username
    ? `@${from.username}`
    : `<a href="tg://user?id=${from.id}">${escapeHtml(
        from.first_name || "Админ",
      )}</a>`;

  const updatedText = originalText + `\n\n👨‍💻 Сейчас занимается: ${adminLabel}`;

  await ctx.editMessageText(updatedText, {
    parse_mode: "HTML",
    // reply_markup не передаём → кнопка пропадёт
  });

  await ctx.answerCbQuery?.("Вы взяли репорт 👍");
};
