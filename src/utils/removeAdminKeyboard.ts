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
    // Вариант 1: полностью удалить клавиатуру
    await ctx.telegram.editMessageReplyMarkup(
      msg.chatId,
      msg.messageId,
      undefined,
      undefined,
    );

    // Вариант 2 (на случай капризов API): установить пустую клавиатуру
    // await ctx.telegram.editMessageReplyMarkup(msg.chatId, msg.messageId, undefined, { inline_keyboard: [] });
  } catch (e) {
    // Если сообщение уже отредактировано/удалено – здесь будет ошибка, игнорируем
    // console.warn('removeAdminKeyboard error:', e?.description || e);
  }
}
