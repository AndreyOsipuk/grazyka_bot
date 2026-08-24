import type { CommandContext } from "../types/types";
import { isAdmin } from "../utils";
import { formatDuration } from "../utils/formatDuration";
import { getAllActiveUserIds, getUser } from "../utils/redis";

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function stats(ctx: CommandContext) {
  const text = ctx.message?.text ?? "";

  const [, ...args] = text.split(/\s+/);
  const arg = args[0];
  const now = Date.now();

  const isUserQuery =
    arg && (arg.startsWith("@") || (/^\d+$/.test(arg) && arg.length >= 8)); // длинные цифры считаем ID

  if (arg && isUserQuery) {
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

    const diffMs = now - Number(user.last_message);
    const detailed = formatDuration(diffMs);

    const displayName = user.username
      ? `@${user.username}`
      : `<a href="tg://user?id=${foundId}">${user.first_name || "Без имени"}</a>`;

    return ctx.replyWithHTML(
      [`📅 Последнее сообщение ${displayName}: ${detailed} назад`].join("\n"),
    );
  }

  if (!isAdmin(ctx.from.id)) {
    return ctx.reply("🚫 Общую статистику могут запрашивать только админы");
  }

  const days = arg && /^\d+$/.test(arg) ? parseInt(arg, 10) || 30 : 30;

  const ids = await getAllActiveUserIds();
  const inactiveUsers: { id: string; displayName: string; diffDays: number }[] =
    [];

  for (const id of ids) {
    const user = await getUser(id);
    if (!user?.last_message) continue;

    const diffDays = Math.floor((now - Number(user.last_message)) / 86400000);

    if (diffDays >= days) {
      const displayName = user.username
        ? `@${user.username}`
        : `<a href="tg://user?id=${id}">${user.first_name || "Без имени"}</a>`;

      inactiveUsers.push({ id, displayName, diffDays });
    }
  }

  inactiveUsers.sort((a, b) => b.diffDays - a.diffDays);

  const total = ids.length;
  const inactiveCount = inactiveUsers.length;

  const inactiveList = inactiveUsers.map(
    (u) => `• ${u.displayName} — ${u.diffDays} дней`,
  );

  const message =
    inactiveCount > 0
      ? [
          `🕰 Неактивны более ${days} дней:\n`,
          inactiveList.join("\n"),
          "",
          `📊 Всего неактивных: <b>${inactiveCount}</b> из <b>${total}</b>`,
        ].join("\n")
      : `✅ Все писали менее ${days} дней назад.`;

  await ctx.replyWithHTML(message);
}
