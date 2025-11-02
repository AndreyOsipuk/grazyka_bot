import type { Context } from "telegraf";

import {
  silenceTimers,
  userFirstMessages,
  userJoinTimes,
  welcomeMsgs,
} from "../core";
import { escapeHtml, GROUP_ID, TIME_LIMIT_MINUTES } from "../utils";
import { clearSilenceTimer } from "../utils/clearSilenceTimer";
import { messageHasPhoto } from "../utils/messageHasPhoto";
import { pluralizeMinutes } from "../utils/pluralizeMinutes";
import { saveUserActivity } from "../utils/redis";

export const chatMessage = async (ctx: Context) => {
  if (!ctx.chat || ctx.chat.id !== GROUP_ID) return;
  const user = ctx.from;

  if (!user || user.is_bot) return;
  if (!ctx.message) return;

  await saveUserActivity(user);

  if (
    userFirstMessages.has(user.id) &&
    userFirstMessages.get(user.id) === false
  ) {
    if (!messageHasPhoto(ctx.message)) {
      await ctx.replyWithHTML(
        [
          `⚠️ <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || "гость")}</a>,`,
          "первое сообщение должно содержать фото (или мем 18+) 📸.",
          `Отправьте фото, иначе вы будете забанены через ${pluralizeMinutes(TIME_LIMIT_MINUTES)} после вступления.`,
        ].join("\n"),
      );
      // Ничего не меняем: таймер не снимаем, статус не отмечаем
      return;
    }

    userFirstMessages.set(user.id, true);

    // снять таймер
    clearSilenceTimer(user.id, silenceTimers);

    // удалить приветственное сообщение, если есть
    const wm = welcomeMsgs.get(user.id);
    if (wm) {
      try {
        await ctx.telegram.deleteMessage(wm.chatId, wm.messageId);
      } catch {
        // сообщение уже могли удалить/изменить — игнорируем
      } finally {
        welcomeMsgs.delete(user.id);
      }
    }

    await ctx.replyWithHTML(
      [
        `✅ Спасибо за ваше первое сообщение, <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || "гость")}</a>!`,
        "",
        "🎉 Добро пожаловать в сообщество!",
      ].join("\n"),
    );

    userJoinTimes.delete(user.id);
  }
};
