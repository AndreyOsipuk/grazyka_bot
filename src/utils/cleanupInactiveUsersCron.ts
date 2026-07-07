import type { Context, Telegraf } from "telegraf";
import type { Update } from "telegraf/types";

import { cleanupUser } from "./cleanupUser";
import { GROUP_ID } from "./index";
import { getAllActiveUserIds, getUser, saveUserField } from "./redis";

type Bot = Telegraf<Context<Update>>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Пауза между проверками юзеров, чтобы не забивать Telegram API пачкой запросов
// (иначе прочие действия бота, например репост мема, встают в очередь).
const THROTTLE_MS = 250;

function isInChat(status: string): boolean {
  return (
    status === "creator" ||
    status === "administrator" ||
    status === "member" ||
    status === "restricted"
  );
}

async function checkUser(bot: Bot, userId: number): Promise<void> {
  const cached = await getUser(userId);
  if (cached?.is_bot === "1") return;

  try {
    // Один getChatMember на юзера покрывает и «бот ли», и «в чате ли».
    const member = await bot.telegram.getChatMember(GROUP_ID, userId);

    if (member.user.is_bot) {
      await saveUserField(userId, "is_bot", "1");
    }

    if (!isInChat(member.status)) {
      console.log(`🚪 User ${userId} is NOT in chat → cleanup`);
      await cleanupUser(userId, bot);
    }
  } catch (err) {
    // 400 «user not found» — пользователя нет в чате, чистим.
    const code = (err as { response?: { error_code?: number } })?.response
      ?.error_code;
    if (code === 400) {
      await cleanupUser(userId, bot);
    } else {
      // сетевые/прочие ошибки — не удаляем, просто логируем
      console.error(`Ошибка при проверке пользователя ${userId}:`, err);
    }
  }
}

async function runCleanup(bot: Bot): Promise<void> {
  const userIds = await getAllActiveUserIds();
  for (const rawId of userIds) {
    const userId = Number(rawId);
    if (!userId) continue;
    await checkUser(bot, userId);
    await sleep(THROTTLE_MS);
  }
}

export function startCleanupInactiveUsersCron(bot: Bot, intervalSec = 1800) {
  console.log("⏳ Starting cleanup cron for inactive users…");

  let running = false;

  setInterval(async () => {
    // Не запускаем новый проход, пока не закончился предыдущий.
    if (running) return;
    running = true;
    try {
      await runCleanup(bot);
    } catch (err) {
      console.error("Cron error:", err);
    } finally {
      running = false;
    }
  }, intervalSec * 1000);
}
