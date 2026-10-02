import type { Context } from "telegraf";
import type { InlineKeyboardMarkup, User } from "telegraf/types";

import type { ActionContext } from "../types/types";
import {
  ADMIN_GROUP_ID,
  GROUP_ID,
  isAdmin,
  MEME_CHANNEL_ID,
  MEME_CHANNEL_LINK,
} from "../utils";
import { formatUserTag } from "../utils/formatUserTag";
import {
  buildMemeModKeyboard,
  MEME_APPROVED_TEXT,
  MEME_PENDING_TEXT,
  MEME_REJECTED_TEXT,
  parseMemeModData,
} from "../utils/memeModeration";

// Защита от двойного решения (два админа нажали одновременно): по мему решаем
// один раз. После решения кнопки с карточки убираются, так что и после рестарта
// повторно нажать нельзя.
const decided = new Set<number>();

// Обновляет статус-сообщение автору в чате. Если его успели удалить — шлём
// новым ответом на сам мем.
async function setStatus(
  ctx: Context,
  statusMsgId: number,
  memeMsgId: number,
  text: string,
  extra?: { reply_markup?: InlineKeyboardMarkup },
) {
  try {
    await ctx.telegram.editMessageText(
      GROUP_ID,
      statusMsgId,
      undefined,
      text,
      extra,
    );
  } catch (e) {
    console.error(`Не удалось обновить статус мема ${memeMsgId}:`, e);
    try {
      await ctx.telegram.sendMessage(GROUP_ID, text, {
        reply_parameters: {
          message_id: memeMsgId,
          allow_sending_without_reply: true,
        },
        disable_notification: true,
        ...extra,
      });
    } catch (e2) {
      console.error(`Не удалось уведомить автора мема ${memeMsgId}:`, e2);
    }
  }
}

// Дописывает решение в подпись карточки и убирает кнопки.
async function markCard(ctx: ActionContext, line: string) {
  const msg = ctx.callbackQuery.message;
  const caption = msg && "caption" in msg ? (msg.caption ?? "") : "";
  const entities =
    msg && "caption_entities" in msg ? msg.caption_entities : undefined;
  try {
    await ctx.editMessageCaption(`${caption}\n\n${line}`, {
      caption_entities: entities,
      reply_markup: { inline_keyboard: [] },
    });
  } catch (e) {
    console.error("Не удалось обновить карточку модерации мема:", e);
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {
      // кнопки уже убраны — не критично
    }
  }
}

// Мем участника из чата → статус автору в чате + карточка в админ-чат.
export async function submitMemeForModeration(
  ctx: Context,
  memeMsgId: number,
  user: User,
) {
  let statusMsgId: number;
  try {
    const status = await ctx.telegram.sendMessage(GROUP_ID, MEME_PENDING_TEXT, {
      reply_parameters: { message_id: memeMsgId },
      disable_notification: true,
    });
    statusMsgId = status.message_id;
  } catch (e) {
    console.error(`Не удалось ответить на мем ${memeMsgId} статусом:`, e);
    return;
  }

  const tag = formatUserTag(user.id, user);
  try {
    await ctx.telegram.copyMessage(ADMIN_GROUP_ID, GROUP_ID, memeMsgId, {
      caption: `🖼 Мем из чата от ${tag} (id <code>${user.id}</code>)`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: buildMemeModKeyboard(
          GROUP_ID,
          memeMsgId,
          user.id,
          statusMsgId,
        ),
      },
    });
  } catch (e) {
    console.error(`Не удалось отправить мем ${memeMsgId} на модерацию:`, e);
    await setStatus(
      ctx,
      statusMsgId,
      memeMsgId,
      "⚠️ Не получилось отправить мем на модерацию, попробуйте позже",
    );
  }
}

// Админ нажал «Одобрить» / «Отклонить» на карточке.
export const memeModDecision = async (ctx: ActionContext) => {
  const admin = ctx.from;
  if (!admin || !isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }

  const d = parseMemeModData(ctx.match[0]);
  if (!d) return ctx.answerCbQuery();

  if (decided.has(d.memeMsgId)) {
    return ctx.answerCbQuery("По этому мему уже решили", { show_alert: true });
  }
  decided.add(d.memeMsgId);

  const adminName = admin.first_name || String(admin.id);

  if (!d.approve) {
    await ctx.answerCbQuery("Отклонено");
    await markCard(ctx, `❌ Отклонено: ${adminName}`);
    await setStatus(ctx, d.statusMsgId, d.memeMsgId, MEME_REJECTED_TEXT);
    return;
  }

  let channelMsgId: number;
  try {
    // В канал — только медиа, подпись убираем целиком.
    const res = await ctx.telegram.copyMessage(
      MEME_CHANNEL_ID,
      GROUP_ID,
      d.memeMsgId,
      { caption: "" },
    );
    channelMsgId = res.message_id;
  } catch (e) {
    // не вышло — разрешаем нажать ещё раз (например, после выдачи прав в канале)
    decided.delete(d.memeMsgId);
    console.error(`Не удалось опубликовать мем ${d.memeMsgId} из чата:`, e);
    return ctx.answerCbQuery(
      "Не удалось опубликовать: мем удалён из чата или у бота нет прав в канале.",
      { show_alert: true },
    );
  }

  await ctx.answerCbQuery("Опубликовано");
  await markCard(ctx, `✅ Одобрено: ${adminName}`);

  const link = MEME_CHANNEL_LINK ? `${MEME_CHANNEL_LINK}/${channelMsgId}` : "";
  await setStatus(
    ctx,
    d.statusMsgId,
    d.memeMsgId,
    MEME_APPROVED_TEXT,
    link
      ? {
          reply_markup: {
            inline_keyboard: [[{ text: "Открыть в канале", url: link }]],
          },
        }
      : undefined,
  );
};
