import type { Context } from "telegraf";

import type { ActionContext } from "../types/types";
import {
  ADMIN_GROUP_ID,
  isAdmin,
  MEME_CHANNEL_ID,
  MEME_CHANNEL_LINK,
} from "../utils";
import { formatUserTag } from "../utils/formatUserTag";
import { isMemeBanned } from "../utils/memeBan";
import { messageHasPhoto } from "../utils/messageHasPhoto";

// «Предложка»: юзер шлёт медиа боту в личку → бот предлагает отправить его на
// модерацию → админ публикует в канал. Медиа не копируем в Redis: ссылаемся на
// него по (userId, messageId) в личке — этого хватает и переживает рестарт.

export const suggestCommand = async (ctx: Context) => {
  const chat = ctx.chat;
  if (!chat || chat.type !== "private") return;
  if (!MEME_CHANNEL_ID) {
    await ctx.reply("Предложка мемов сейчас недоступна.");
    return;
  }
  await ctx.reply(
    [
      `Хочешь предложить мем в канал ${MEME_CHANNEL_ID}?`,
      "",
      "Пришли мне фото, видео или гифку - и я отправлю её админам на модерацию.",
      "Если одобрят, мем появится в канале.",
    ].join("\n"),
  );
};

// Юзер прислал медиа в личку → сразу шлём его в админ-группу на модерацию.
export const suggestOnMedia = async (ctx: Context) => {
  if (!MEME_CHANNEL_ID) return;
  const chat = ctx.chat;
  if (!chat || chat.type !== "private") return;
  const user = ctx.from;
  if (!user || user.is_bot) return;
  if (!ctx.message) return;
  if (!messageHasPhoto(ctx.message)) return;

  if (await isMemeBanned(user.id)) {
    await ctx.reply("Тебе нельзя предлагать мемы.");
    return;
  }

  const mediaMsgId = ctx.message.message_id;
  const tag = formatUserTag(user.id, user);

  try {
    await ctx.telegram.copyMessage(ADMIN_GROUP_ID, user.id, mediaMsgId, {
      caption: `🖼 Предложка от ${tag} (id <code>${user.id}</code>)`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Опубликовать",
              callback_data: `sugok_${user.id}_${mediaMsgId}`,
            },
            {
              text: "❌ Отклонить",
              callback_data: `sugno_${user.id}_${mediaMsgId}`,
            },
          ],
        ],
      },
    });
  } catch (e) {
    console.error("Ошибка отправки предложки на модерацию:", e);
    await ctx.reply("Не получилось отправить на модерацию, попробуй позже.");
    return;
  }

  await ctx.reply(
    "📨 Отправил твой мем админам на модерацию! Если одобрят - появится в канале.",
    { reply_parameters: { message_id: mediaMsgId } },
  );
};

// Админ одобрил предложку → публикуем медиа в канал и уведомляем автора.
export const suggestApprove = async (ctx: ActionContext) => {
  const admin = ctx.from;
  if (!admin || !isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }

  const submitterId = Number(ctx.match[1]);
  const mediaMsgId = Number(ctx.match[2]);

  let channelMsgId: number;
  try {
    // Публикуем чистое медиа (без подписи), копируя оригинал из лички автора.
    const res = await ctx.telegram.copyMessage(
      MEME_CHANNEL_ID,
      submitterId,
      mediaMsgId,
      { caption: "" },
    );
    channelMsgId = res.message_id;
  } catch (e) {
    console.error("Ошибка публикации предложки:", e);
    return ctx.answerCbQuery("Не удалось опубликовать (медиа удалено?).", {
      show_alert: true,
    });
  }

  await ctx.answerCbQuery("Опубликовано");
  try {
    await ctx.editMessageReplyMarkup(undefined);
  } catch {
    // разметку могли убрать — не критично
  }

  // Уведомляем автора со ссылкой на пост.
  const link = MEME_CHANNEL_LINK ? `${MEME_CHANNEL_LINK}/${channelMsgId}` : "";
  try {
    await ctx.telegram.sendMessage(
      submitterId,
      "🎉 Твой мем опубликован в канале!",
      link
        ? {
            reply_markup: {
              inline_keyboard: [[{ text: "Открыть в канале", url: link }]],
            },
          }
        : {},
    );
  } catch (e) {
    console.error("Не удалось уведомить автора о публикации:", e);
  }
};

// Админ отклонил предложку → уведомляем автора.
export const suggestReject = async (ctx: ActionContext) => {
  const admin = ctx.from;
  if (!admin || !isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }

  const submitterId = Number(ctx.match[1]);

  await ctx.answerCbQuery("Отклонено");
  try {
    await ctx.editMessageReplyMarkup(undefined);
  } catch {
    // разметку могли убрать — не критично
  }

  try {
    await ctx.telegram.sendMessage(
      submitterId,
      "😕 Твой мем не прошёл модерацию. Попробуй другой!",
    );
  } catch (e) {
    console.error("Не удалось уведомить автора об отклонении:", e);
  }
};
