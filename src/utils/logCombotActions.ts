import type { Context } from "telegraf";

import { ADMIN_GROUP_ID, GROUP_ID } from "./index";

const COMBOT_USERNAME = "combot";

// Фразы, по которым мы считаем сообщение модерацией
const MODERATION_WHITELIST: RegExp[] = [
  /ban/i,
  /banned/i,
  /unban/i,
  /kick/i,
  /kicked/i,
  /mute/i,
  /muted/i,
  /unmute/i,
  /warn/i,
  /ограничен/i,
  /ограничена/i,
  /заглушен/i,
  /заглушена/i,
  /мут/i,
  /замьючен/i,
  /замьючена/i,
  /кикнут/i,
  /кикнута/i,
  /забанен/i,
  /заблокирован/i,
  /заблокирована/i,
];

// Фразы, которые явно относятся к репутации и подобному (не хотим)
const REPUTATION_BLACKLIST: RegExp[] = [
  /has increased reputation of/i,
  /has decreased reputation of/i,
  /reputation/i,
];

export const logCombotModeration = async (ctx: Context) => {
  const chat = ctx.chat;
  const from = ctx.from;

  if (!chat || chat.id !== GROUP_ID) return;
  if (!from) return;

  // интересуют только сообщения от combot
  if (from.username !== COMBOT_USERNAME) return;

  const msg: any = ctx.message;
  if (!msg) return;

  const text: string | undefined =
    ("text" in msg && msg.text) ||
    ("caption" in msg && msg.caption) ||
    undefined;

  if (!text) return;

  // Если это репутация — сразу выходим
  const isReputation = REPUTATION_BLACKLIST.some((re) => re.test(text));
  if (isReputation) return;

  // Если в тексте есть признаки модерации — считаем это админским действием
  const isModeration = MODERATION_WHITELIST.some((re) => re.test(text));
  if (!isModeration) return;

  // Здесь считаем, что это как раз kick/mute/ban/ограничение и т.п.
  // Самый простой и надёжный способ — просто скопировать сообщение в админский чат
  await ctx.telegram.copyMessage(ADMIN_GROUP_ID, chat.id, msg.message_id);
};
