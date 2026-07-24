import type { Context } from "telegraf";
import type { TelegramEmoji } from "telegraf/types";

import {
  ADMIN_GROUP_ID,
  GROUP_ID,
  isAdmin,
  MEME_CHANNEL_ID,
  MEME_CHANNEL_LINK,
} from "../utils";
import { isMemeBanned } from "../utils/memeBan";
import { hasMemeTag, parseMemeCommand } from "../utils/memeTag";
import { messageHasPhoto } from "../utils/messageHasPhoto";

// Чтобы не спамить админку на каждом меме при неверной настройке канала —
// уведомляем об ошибке канала один раз за сессию.
let notifiedChannelError = false;

async function react(
  ctx: Context,
  chatId: number,
  messageId: number,
  emoji: TelegramEmoji,
) {
  try {
    await ctx.telegram.setMessageReaction(chatId, messageId, [
      { type: "emoji", emoji },
    ]);
  } catch (e) {
    console.error("Не удалось поставить реакцию на мем:", e);
  }
}

async function clearReaction(ctx: Context, chatId: number, messageId: number) {
  try {
    await ctx.telegram.setMessageReaction(chatId, messageId, []);
  } catch (e) {
    console.error("Не удалось снять реакцию:", e);
  }
}

// Копирует мем в канал. Возвращает message_id поста в канале или null при ошибке.
async function copyToChannel(
  ctx: Context,
  chatId: number,
  messageId: number,
  caption: string,
): Promise<number | null> {
  try {
    const res = await ctx.telegram.copyMessage(
      MEME_CHANNEL_ID,
      chatId,
      messageId,
      {
        caption,
      },
    );
    return res.message_id;
  } catch (e) {
    console.error("Ошибка репоста мема в канал:", e);
    if (!notifiedChannelError) {
      notifiedChannelError = true;
      try {
        await ctx.telegram.sendMessage(
          ADMIN_GROUP_ID,
          `❌ Не удалось запостить мем в канал (${MEME_CHANNEL_ID}). Проверьте, что бот — админ канала с правом публикации.\nОшибка: ${(e as Error)?.message || e}`,
        );
      } catch {
        // не смогли уведомить админку — уже залогировали выше
      }
    }
    return null;
  }
}

// Отвечает автору мема ссылкой на пост в канале (только для публичного канала).
async function replyWithChannelLink(
  ctx: Context,
  chatId: number,
  replyToId: number,
  channelMsgId: number,
) {
  if (!MEME_CHANNEL_LINK) return; // приватный канал — ссылку на пост не строим
  try {
    await ctx.telegram.sendMessage(chatId, "📸 Твой мем в канале 👇", {
      reply_parameters: { message_id: replyToId },
      disable_notification: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть в канале",
              url: `${MEME_CHANNEL_LINK}/${channelMsgId}`,
            },
          ],
        ],
      },
    });
  } catch (e) {
    console.error("Не удалось отправить ссылку на мем:", e);
  }
}

// Копирует sourceMsgId в канал. anchorMsgId — сообщение пользователя, на которое
// вешаем отклик: сначала (сразу) 👍 для мгновенной обратной связи, потом, когда
// пост скопирован, ссылку на него. Если копирование не удалось — снимаем 👍.
async function repostAndConfirm(
  ctx: Context,
  chatId: number,
  sourceMsgId: number,
  anchorMsgId: number,
  caption: string,
): Promise<number | null> {
  await react(ctx, chatId, anchorMsgId, "👍");
  const channelMsgId = await copyToChannel(ctx, chatId, sourceMsgId, caption);
  if (channelMsgId !== null) {
    await replyWithChannelLink(ctx, chatId, anchorMsgId, channelMsgId);
  } else {
    await clearReaction(ctx, chatId, anchorMsgId);
  }
  return channelMsgId;
}

// Админ отвечает "мем" (реплаем) на медиа → копируем то сообщение в канал.
// Текст после "мем" становится подписью. Доступно только админам.
async function tryAdminReplyRepost(
  ctx: Context,
  chatId: number,
  userId: number,
): Promise<boolean> {
  const message = ctx.message;
  if (!message) return false;

  const replied =
    "reply_to_message" in message ? message.reply_to_message : undefined;
  const text = "text" in message ? (message.text ?? "") : "";
  if (!replied || !text) return false;

  const { isMeme } = parseMemeCommand(text);
  if (!isMeme) return false;
  if (!isAdmin(userId)) return false;

  if (!messageHasPhoto(replied)) {
    try {
      await ctx.telegram.sendMessage(
        chatId,
        "⚠️ Ответьте «мем» на сообщение с картинкой, видео или гифкой.",
        { reply_parameters: { message_id: message.message_id } },
      );
    } catch {
      // не смогли ответить — не критично
    }
    return true;
  }

  // В канал уходит только медиа — подпись убираем всегда (ни оригинальную, ни
  // текст после "мем" не переносим).
  const finalCaption = "";

  // Источник для копирования — реплайнутое медиа; отклик (👍 + ссылку) вешаем
  // на команду "мем" внизу, где админ её написал, чтобы он сразу его видел.
  await repostAndConfirm(
    ctx,
    chatId,
    replied.message_id,
    message.message_id,
    finalCaption,
  );
  return true;
}

export const memeRepost = async (ctx: Context) => {
  if (!MEME_CHANNEL_ID) return; // фича выключена
  if (!ctx.chat || ctx.chat.id !== GROUP_ID) return;

  const user = ctx.from;
  if (!user || user.is_bot) return;
  if (!ctx.message) return;

  const chatId = ctx.chat.id;

  // Ветка админа: reply "мем" на медиа.
  if (await tryAdminReplyRepost(ctx, chatId, user.id)) return;

  // Обычная ветка: медиа с #мем в подписи (доступно всем).
  const message = ctx.message;
  if (!messageHasPhoto(message)) return;

  const caption = "caption" in message ? (message.caption ?? "") : "";
  if (!hasMemeTag(caption)) return;

  // Забаненному по мемам — не репостим, ставим 👎 вместо 👍.
  if (await isMemeBanned(user.id)) {
    await react(ctx, chatId, message.message_id, "👎");
    return;
  }

  // В канал уходит только медиа — подпись целиком убираем (пустая строка).
  await repostAndConfirm(
    ctx,
    chatId,
    message.message_id,
    message.message_id,
    "",
  );
};
