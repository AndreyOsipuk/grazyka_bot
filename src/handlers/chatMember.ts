import type { Context } from "telegraf";

import { GROUP_ID } from "../utils";
import { cleanupUser } from "../utils/cleanupUser";

// Синхронизация при выходе/кике. Как только участник покинул группу или был
// удалён (в т.ч. через !kick стороннего бота или руками админом), Telegram шлёт
// апдейт chat_member — сразу чистим его данные в Redis, чтобы он не висел в
// /stats. Требует allowedUpdates: ["chat_member"] в bot.launch.
export const onChatMember = async (ctx: Context) => {
  const upd = ctx.chatMember;
  if (!upd) return;
  if (ctx.chat?.id !== GROUP_ID) return;

  const status = upd.new_chat_member.status;
  if (status === "left" || status === "kicked") {
    const userId = upd.new_chat_member.user.id;
    await cleanupUser(userId, { telegram: ctx.telegram });
  }
};
