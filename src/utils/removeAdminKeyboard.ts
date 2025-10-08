import type { Context } from "telegraf";

import type { UserRequest } from "../types";

export async function removeAdminKeyboard<C>(
  ctx: Context,
  userId: number,
  userRequests: Map<number, UserRequest>,
) {
  const rec = userRequests.get(userId);
  const msg = rec?.adminMsg;
  if (!msg) return;

  try {
    await ctx.telegram.editMessageReplyMarkup(
      msg.chatId,
      msg.messageId,
      undefined,
      { inline_keyboard: [] },
    );

  } catch (e: any) {
    console.error("Не удалось снять inline-клавиатуру:", e?.message || e);
  }
}
