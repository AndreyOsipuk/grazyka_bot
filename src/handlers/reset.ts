import type { Context } from "telegraf";

import { silenceTimers, userInviteLinks, userRequests } from "../core";
import { clearSilenceTimer } from "../utils/clearSilenceTimer";

export const reset = async (ctx: Context) => {
  const user = ctx.from;

  if (!user) return;

  userRequests.delete(user.id);
  userInviteLinks.delete(user.id);
  clearSilenceTimer(user.id, silenceTimers);

  await ctx.reply(
    "🔄 Ваши предыдущие запросы сброшены. Используйте /start для создания нового запроса с новой ссылкой.",
  );
};
