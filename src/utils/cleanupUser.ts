import { redisPrefix } from "../const";
import {
  silenceTimers,
  userFirstMessages,
  userJoinTimes,
  welcomeMsgs,
} from "../core";
import { clearSilenceTimer } from "./clearSilenceTimer";
import { deleteProfile } from "./profiles/profiles";
import { redis } from "./redis";

export async function cleanupUser(userId: number, bot: any) {
  console.log("🔥 Cleaning user:", userId);

  // удалить приветственное сообщение
  const wm = welcomeMsgs.get(userId);
  if (wm) {
    try {
      await bot.telegram.deleteMessage(wm.chatId, wm.messageId);
    } catch {}
    welcomeMsgs.delete(userId);
  }

  // очистить таймер
  clearSilenceTimer(userId, silenceTimers);

  // очистить мапы
  userFirstMessages.delete(userId);
  userJoinTimes.delete(userId);

  // удалить профиль
  try {
    await deleteProfile(userId);
  } catch {}

  // удалить из redis
  try {
    await redis.del(`${redisPrefix}user:${userId}`);
  } catch {}
}
