import type { MessageContext } from "../types";
import {
  ADMIN_GROUP_ID,
  ADMIN_IDS,
  ADMIN_USERNAMES,
  escapeHtml,
  GROUP_ID,
} from "../utils";

export const report = async (ctx: MessageContext) => {
  if (!ctx.chat || ctx.chat.id !== GROUP_ID) {
    return;
  }

  const user = ctx.from;

  if (!user) return;

  const reply = ctx.message?.reply_to_message;

  // Проверяем, что команда используется в ответ на сообщение
  if (!reply) {
    return ctx.reply(
      "❌ Пожалуйста, используйте команду /report в ответ на сообщение, которое хотите пожаловаться.",
      {
        reply_parameters: {
          message_id: ctx.message.message_id,
        },
      },
    );
  }

  try {
    // Получаем текст сообщения, на которое ответили
    let replyText = "";
    if ("text" in reply) {
      replyText = reply.text || "";
    } else if ("caption" in reply && reply.caption) {
      replyText = reply.caption;
    } else {
      replyText = "⏺️ Медиа-сообщение (фото, видео и т.д.)";
    }

    // Обрезаем длинный текст
    if (replyText.length > 500) {
      replyText = replyText.substring(0, 500) + "...";
    }

    const chatTitle = "title" in ctx.chat ? ctx.chat.title : "неизвестный чат";

    let adminMentions = "";

    if (ADMIN_USERNAMES.length > 0) {
      // Используем формат с тегами <a> для кликабельных упоминаний
      adminMentions = ADMIN_USERNAMES.map(
        (username) => `<a href="https://t.me/${username}">@${username}</a>`,
      ).join(" ");
    } else {
      // Запасной вариант через ID
      adminMentions = ADMIN_IDS.map(
        (id) => `<a href="tg://user?id=${id}">️</a>`,
      ).join(" ");
    }

    // Сообщение в основном чате
    const publicText = [
      `🚨 <b>Репорт от пользователя!</b>`,
      `👤 От: <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || "Пользователь")}</a>`,
      `💬 На сообщение:`,
      `<blockquote>${escapeHtml(replyText)}</blockquote>`,
      "",
      `${adminMentions} - проверьте, пожалуйста`,
      `🔗 [Перейти к сообщению](https://t.me/c/${String(GROUP_ID).replace("-100", "")}/${reply.message_id})`,
    ].join("\n");

    await ctx.replyWithHTML(publicText, {
      reply_parameters: {
        message_id: reply.message_id,
      },
    });

    // Сообщение в админском чате
    const adminMessage = [
      `${adminMentions}`,
      "🚨 <b>Новый репорт в чате!</b>",
      `👤 От: <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || "Пользователь")}</a>`,
      `🆔 ID: <code>${user.id}</code>`,
      `📍 Чат: ${escapeHtml(chatTitle)}`,
      "",
      `💬 Сообщение, на которое пожаловались:\n<blockquote>${escapeHtml(replyText)}</blockquote>`,
      "",
      `👤 Автор сообщения: ${reply.from?.first_name || "Неизвестно"} (ID: ${reply.from?.id || "Неизвестно"})`,
      "",
      `🔗 [Перейти к сообщению](https://t.me/c/${String(GROUP_ID).replace("-100", "")}/${reply.message_id})`,
    ].join("\n");

    await ctx.telegram.sendMessage(ADMIN_GROUP_ID, adminMessage, {
      parse_mode: "HTML",
    });

    console.log(`✅ Репорт отправлен от пользователя ${user.id}`);
  } catch (error) {
    console.error("Ошибка при обработке репорта:", error);

    try {
      await ctx.reply(
        "❌ Произошла ошибка при отправке репорта. Попробуйте позже.",
        {
          reply_parameters: {
            message_id: ctx.message.message_id,
          },
        },
      );
    } catch (e) {
      // Если не можем ответить, просто логируем
      console.error("Не могу отправить сообщение об ошибке:", e);
    }
  }
};
