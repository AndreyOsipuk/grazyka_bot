import type { Context } from "telegraf";

import type { UserRequest } from "../types";
import { ADMIN_GROUP_ID } from "./index";

export async function closeAdminRequest(
  ctx: Context,
  userId: number,
  userRequests: Map<number, UserRequest>,
  newText: string,
) {
  const rec = userRequests.get(userId);
  const adminMsg = rec?.adminMsg;
  if (!adminMsg) return;

  const oldText = rec?.adminMsg?.text || "";

  const combinedText = [oldText.trim(), "", "──────", newText.trim()].join(
    "\n",
  );

  try {
    await ctx.telegram.editMessageText(
      adminMsg.chatId,
      adminMsg.messageId,
      undefined,
      combinedText,
      {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [] },
        disable_web_page_preview: true as any, // если нужно
      } as any,
    );
  } catch (e) {
    console.error("sendMessage failed:", (e as any)?.message || e);

    await ctx.telegram.sendMessage(ADMIN_GROUP_ID, `❌ sendMessage failed`);
  }
}
