import type { Context } from "telegraf";
import type { TelegramEmoji } from "telegraf/types";

import { ADMIN_GROUP_ID, GROUP_ID, MEME_CHANNEL_ID } from "../utils";
import { isMemeBanned } from "../utils/memeBan";
import { hasMemeTag, stripMemeTag } from "../utils/memeTag";
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

async function copyToChannel(
  ctx: Context,
  chatId: number,
  messageId: number,
  caption: string,
): Promise<boolean> {
  try {
    await ctx.telegram.copyMessage(MEME_CHANNEL_ID, chatId, messageId, {
      caption,
    });
    return true;
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
    return false;
  }
}

export const memeRepost = async (ctx: Context) => {
  if (!MEME_CHANNEL_ID) return; // фича выключена
  if (!ctx.chat || ctx.chat.id !== GROUP_ID) return;

  const user = ctx.from;
  if (!user || user.is_bot) return;
  if (!ctx.message) return;

  const message = ctx.message;
  if (!messageHasPhoto(message)) return;

  const caption = "caption" in message ? (message.caption ?? "") : "";
  if (!hasMemeTag(caption)) return;

  const chatId = ctx.chat.id;

  // Забаненному по мемам — не репостим, ставим 👎 вместо 👍.
  if (await isMemeBanned(user.id)) {
    await react(ctx, chatId, message.message_id, "👎");
    return;
  }

  const ok = await copyToChannel(
    ctx,
    chatId,
    message.message_id,
    stripMemeTag(caption),
  );
  if (ok) await react(ctx, chatId, message.message_id, "👍");
};
