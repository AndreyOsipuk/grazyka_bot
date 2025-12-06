import type { Context, Telegraf } from "telegraf";
import type { Update } from "telegraf/types";

import { cleanupUser } from "./cleanupUser";
import { GROUP_ID } from "./index";
import { isUserInChat } from "./isUserInChat";
import { getAllActiveUserIds, getUser, saveUserField } from "./redis";

export function startCleanupInactiveUsersCron(
  bot: Telegraf<Context<Update>>,
  intervalSec = 60,
) {
  console.log("⏳ Starting cleanup cron for inactive users…");

  // ПОМЕНЯТЬ ЛОГИКУ
  setInterval(async () => {
    try {
      // Получаем всех юзеров, которые есть в Redis
      const userIds = await getAllActiveUserIds();
      if (!userIds.length) return;

      for (const rawId of userIds) {
        const cached = await getUser(rawId);
        if (cached?.is_bot === "1") {
          // Уже знаем что бот → просто пропускаем
          continue;
        }

        // Делаем реальную проверку через Telegram API
        const member = await bot.telegram.getChatMember(GROUP_ID, +rawId);
        const isBot = member.user.is_bot;

        if (isBot) {
          console.log(`🤖 Bot detected in Redis list → id ${rawId}`);

          // Записываем в Redis флаг is_bot
          await saveUserField(+rawId, "is_bot", "1");
        }

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
