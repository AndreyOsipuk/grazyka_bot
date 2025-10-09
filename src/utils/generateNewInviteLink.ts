import type { Context } from "telegraf";

import { ADMIN_GROUP_ID } from "./index";

export async function generateNewInviteLink(
  ctx: Context,
  userId: number,
  GROUP_ID: number,
  userInviteLinks: Map<
    number,
    { link: string; created_at: Date; used: boolean; used_at?: Date }
  >,
) {
  try {
    const name = `invite_${userId}_${new Date().toLocaleTimeString("ru-RU", { hour12: false })}`;
    const invite = await ctx.telegram.createChatInviteLink(GROUP_ID, {
      member_limit: 1,
      creates_join_request: false,
      name,
    });

    userInviteLinks.set(userId, {
      link: invite.invite_link,
      created_at: new Date(),
      used: false,
    });

    return invite;
  } catch (e) {
    console.error("Ошибка генерации ссылки:", e);

    await ctx.telegram.sendMessage(
      ADMIN_GROUP_ID,
      `❌ Ошибка генерации ссылки`,
    );
    return null;
  }
}
