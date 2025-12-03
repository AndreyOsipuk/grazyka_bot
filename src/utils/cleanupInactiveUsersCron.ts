import type { Context, Telegraf } from "telegraf";
import type { Update } from "telegraf/types";

import { cleanupUser } from "./cleanupUser";
import { GROUP_ID } from "./index";
import { isUserInChat } from "./isUserInChat";
import { getAllActiveUserIds } from "./redis";

export function startCleanupInactiveUsersCron(
  bot: Telegraf<Context<Update>>,
  intervalSec = 60,
) {
  console.log("⏳ Starting cleanup cron for inactive users…");

  setInterval(async () => {
    try {
      // Получаем всех юзеров, которые есть в Redis
      const userIds = await getAllActiveUserIds();
      if (!userIds.length) return;

      for (const rawId of userIds) {
        const userId = Number(rawId);
        if (!userId) continue;

        try {
          const isInChat = await isUserInChat(bot, GROUP_ID, userId);

          if (!isInChat) {
            console.log(`🚪 User ${userId} is NOT in chat → cleanup`);
            await cleanupUser(userId, bot);
          }
        } catch (err) {
          console.error(`Ошибка при проверке пользователя ${userId}:`, err);
        }
      }
    } catch (err) {
      console.error("Cron error:", err);
    }
  }, intervalSec * 1000);
}
