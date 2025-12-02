// src/handlers/chatMemberUpdate.ts
import type { Context } from "telegraf";

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

export async function chatMemberUpdate(ctx: Context) {
  const update = ctx.chatMember;
  if (!update) return;

  const { new_chat_member } = update;
  const user = new_chat_member.user;
  const status = new_chat_member.status;

  // нас интересует уход / кик
  if (status !== "left" && status !== "kicked") return;

  const userId = Number(user.id);

  await deleteProfile(userId);

  // 1. Удаляем приветственное сообщение, если есть
  const wm = welcomeMsgs.get(userId);
  if (wm) {
    try {
      await ctx.telegram.deleteMessage(wm.chatId, wm.messageId);
    } catch {
      // сообщение могли уже удалить — игнорируем
    } finally {
      welcomeMsgs.delete(userId);
    }
  }

  // 2. Чистим таймер тишины
  clearSilenceTimer(userId, silenceTimers);

  // 3. Чистим служебные мапы
  userFirstMessages.delete(userId);
  userJoinTimes.delete(userId);

  // 4. (опционально) Чистим Redis
  try {
    await redis.del(`${redisPrefix}user:${userId}`);
  } catch (e) {
    console.error("Ошибка при удалении пользователя из Redis:", e);
  }
}
