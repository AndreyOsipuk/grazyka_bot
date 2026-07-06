import type { Context } from "telegraf";

import { ADMIN_GROUP_ID, GROUP_ID, isAdmin, MEME_CHANNEL_ID } from "../utils";
import { hasMemeTag, stripMemeTag } from "../utils/memeTag";
import { messageHasPhoto } from "../utils/messageHasPhoto";

// Чтобы не спамить админку на каждом меме при неверной настройке канала —
// уведомляем об ошибке канала один раз за сессию.
let notifiedChannelError = false;

export const memeRepost = async (ctx: Context) => {
  if (!MEME_CHANNEL_ID) return; // фича выключена
  if (!ctx.chat || ctx.chat.id !== GROUP_ID) return;

  const user = ctx.from;
  if (!user || user.is_bot) return;
  if (!ctx.message) return;

  // Репостим только мемы от админов — чтобы канал не засоряли участники.
  if (!isAdmin(user.id)) return;

  const message = ctx.message;
  if (!messageHasPhoto(message)) return;

  const caption = "caption" in message ? (message.caption ?? "") : "";
  if (!hasMemeTag(caption)) return;

  const cleaned = stripMemeTag(caption);

  try {
    await ctx.telegram.copyMessage(
      MEME_CHANNEL_ID,
      ctx.chat.id,
      message.message_id,
      { caption: cleaned },
    );
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
    return;
  }

  // Успех — ставим реакцию 👍 на исходное сообщение.
  try {
    await ctx.telegram.setMessageReaction(ctx.chat.id, message.message_id, [
      { type: "emoji", emoji: "👍" },
    ]);
  } catch (e) {
    console.error("Не удалось поставить реакцию на мем:", e);
  }
};
