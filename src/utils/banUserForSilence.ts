import type { Context } from "telegraf";
import type { User } from "telegraf/types";

import { clearSilenceTimer } from "./clearSilenceTimer";
import { ADMIN_GROUP_ID, escapeHtml, TIME_LIMIT_MINUTES } from "./index";
import { pluralizeMinutesGenitive } from "./pluralizeMinutes";

export const banUserForSilence = async (
  ctx: Context,
  user: User,
  joinTime: Date,
  GROUP_ID: number,
  userJoinTimes: Map<number, Date>,
  userFirstMessages: Map<number, boolean>,
  userInviteLinks: Map<
    number,
    {
      link: string;
      created_at: Date;
      used: boolean;
      used_at?: Date;
    }
  >,
  silenceTimers: Map<number, NodeJS.Timeout>,
) => {
  try {
    const until = Math.floor((Date.now() + 24 * 3600 * 1000) / 1000); // +1 день
    await ctx.telegram.banChatMember(GROUP_ID, user.id, until);
    await ctx.telegram.unbanChatMember(GROUP_ID, user.id);

    await ctx.telegram.sendMessage(
      GROUP_ID,
      [
        `🚫 Пользователь <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || user.id)}</a> был кикнут за нарушение правил.`,
        "",
        `❌ <b>Причина:</b> Не написал первое сообщение или не прислал в течение ${pluralizeMinutesGenitive(TIME_LIMIT_MINUTES)} после вступления.`,
        `⏰ <b>Время вступления:</b> ${joinTime.toLocaleTimeString("ru-RU")}`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );

    try {
      await ctx.telegram.sendMessage(
        ADMIN_GROUP_ID,
        `🚫 Автоматический кик: ${user.first_name || user.id} (ID: ${user.id}) за молчание`,
      );
    } catch (e) {
      console.error(`Ошибка отправки в ADMIN_GROUP_ID=${ADMIN_GROUP_ID}:`, e);
    }

    userJoinTimes.delete(user.id);
    userFirstMessages.delete(user.id);
    userInviteLinks.delete(user.id);
    clearSilenceTimer(user.id, silenceTimers);
  } catch (e) {
    console.error("Ошибка бана пользователя:", e);

    await ctx.telegram.sendMessage(
      ADMIN_GROUP_ID,
      `❌ Ошибка бана пользователя`,
    );
  }
};
