import type { CommandContext } from "../types/types";
import { isAdmin } from "../utils";
import { getAllActiveUserIds, redis } from "../utils/redis";

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function stats(ctx: CommandContext) {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply("🚫 Только админы");
  }

  const [, arg] = ctx.message?.text.split(" ") || [];
  const now = Date.now();

  // === Если передан username или ID ===
  if (arg && (arg.startsWith("@") || /^\d+$/.test(arg))) {
    const target = arg.replace("@", "");
    const allIds = await getAllActiveUserIds();
    let foundId: string | undefined;

    if (/^\d+$/.test(target)) {
      foundId = target;
    } else {
      for (const id of allIds) {
        const username = await redis.hget(`user:${id}`, "username");
        if (username?.toLowerCase() === target.toLowerCase()) {
          foundId = id;
          break;
        }
      }
    }

    if (!foundId) return ctx.reply("❌ Пользователь не найден");

    const last = await redis.hget(`user:${foundId}`, "last_message");
    if (!last) return ctx.reply("❌ Нет данных об активности");

    const diffDays = Math.floor((now - Number(last)) / 86400000);
    const username = await redis.hget(`user:${foundId}`, "username");
    return ctx.reply(
      `📅 Последнее сообщение @${username || foundId} — ${diffDays} дней назад`,
    );
  }

  // === Если передано число ===
  const days = arg ? parseInt(arg, 10) || 7 : 7;
  const ids = await getAllActiveUserIds();
  const inactive: string[] = [];

  for (const id of ids) {
    const last = await redis.hget(`user:${id}`, "last_message");
    if (!last) continue;
    const diffDays = Math.floor((now - Number(last)) / 86400000);
    if (diffDays >= days) {
      const username = await redis.hget(`user:${id}`, "username");
      inactive.push(`• @${username || id} — ${diffDays} дней`);
    }
  }

  const message =
    inactive.length > 0
      ? `🕰 Неактивны более ${days} дней:\n\n${inactive.join("\n")}`
      : `✅ Все писали менее ${days} дней назад.`;

  await ctx.reply(message);
}
