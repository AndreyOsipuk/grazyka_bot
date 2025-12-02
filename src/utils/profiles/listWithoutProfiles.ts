import type { CommandContext } from "../../types/types";
import { ADMIN_GROUP_ID, escapeHtml, GROUP_ID, isAdmin } from "../index";
import { getAllActiveUserIds, getUser } from "../redis";
import { getProfile } from "./profiles";

export const listWithoutProfiles = async (ctx: CommandContext) => {
  const chat = ctx.chat;
  const from = ctx.from;

  if (!chat || (chat.id !== GROUP_ID && chat.id !== ADMIN_GROUP_ID)) return;
  if (!from) return;

  if (!isAdmin(from.id)) {
    return ctx.reply(
      "🚫 Только админы могут смотреть пользователей без анкет.",
    );
  }

  const ids = await getAllActiveUserIds();
  const without: string[] = [];

  for (const id of ids) {
    const profile = await getProfile(id);
    if (profile) continue; // у кого анкета есть — пропускаем

    const user = await getUser(id);

    const displayName = user?.username
      ? `@${user.username}`
      : `<a href="tg://user?id=${id}">${escapeHtml(
          user?.first_name || "Без имени",
        )}</a>`;

    without.push(`• ${displayName}`);
  }

  if (without.length === 0) {
    await ctx.replyWithHTML("✅ У всех активных пользователей есть анкеты.");
    return;
  }

  const text = [
    "❗ Пользователи без анкет:",
    "",
    without.join("\n"),
    "",
    "Рекомендуется мягко пнуть их и попросить заполнить /anketa 🙂",
  ].join("\n");

  await ctx.replyWithHTML(text);
};
