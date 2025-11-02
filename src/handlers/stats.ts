import type { CommandContext } from "../types/types";
import { isAdmin } from "../utils";
import { getAllActiveUserIds, getUser } from "../utils/redis";

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

    for (const id of allIds) {
      const user = await getUser(id);
      const usernameMatch =
        user.username?.toLowerCase() === target.toLowerCase();
      const idMatch = id === target;
      if (usernameMatch || idMatch) {
        foundId = id;
        break;
      }
    }

    if (!foundId) return ctx.reply("❌ Пользователь не найден");

    const user = await getUser(foundId);
    if (!user?.last_message) return ctx.reply("❌ Нет данных об активности");

    const diffDays = Math.floor((now - Number(user.last_message)) / 86400000);

    const displayName = user.username
      ? `@${user.username}`
      : `<a href="tg://user?id=${foundId}">${user.first_name || "Без имени"}</a>`;

    return ctx.replyWithHTML(
      `📅 Последнее сообщение ${displayName} — ${diffDays} дней назад`,
    );
  }

  // === Если передано число ===
  const days = arg ? parseInt(arg, 10) || 14 : 14;
  const ids = await getAllActiveUserIds();
  const inactive: string[] = [];

  for (const id of ids) {
    const user = await getUser(id);
    if (!user?.last_message) continue;

    const diffDays = Math.floor((now - Number(user.last_message)) / 86400000);

    if (diffDays >= days) {
      const displayName = user.username
        ? `@${user.username}`
        : `<a href="tg://user?id=${id}">${user.first_name || "Без имени"}</a>`;

      inactive.push(`• ${displayName} — ${diffDays} дней`);
    }
  }

  const total = ids.length;
  const inactiveCount = inactive.length;

  const message =
    inactive.length > 0
      ? [
          `🕰 Неактивны более ${days} дней:\n`,
          inactive.join("\n"),
          "",
          `📊 Всего неактивных: <b>${inactiveCount}</b> из <b>${total}</b>`,
        ].join("\n")
      : `✅ Все писали менее ${days} дней назад.`;

  await ctx.replyWithHTML(message);
}
