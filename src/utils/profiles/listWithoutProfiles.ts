import type { CommandContext } from "../../types/types";
import { escapeHtml, GROUP_ID, isAdmin } from "../index";
import { getAllActiveUserIds } from "../redis"; // у тебя уже есть
import { getProfile } from "./profiles";

export const listWithoutProfiles = async (ctx: CommandContext) => {
  const chat = ctx.chat;
  const from = ctx.from;
  if (!chat || chat.id !== GROUP_ID) return;
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
    if (!profile) {
      without.push(
        `<a href="tg://user?id=${id}">${escapeHtml(id.toString())}</a>`, // можно улучшить: хранить first_name в Redis
      );
    }
  }

  if (without.length === 0) {
    await ctx.replyWithHTML("✅ У всех активных пользователей есть анкеты.");
    return;
  }

  const text = [
    "❗ Пользователи без анкет:",
    "",
    without.join(", "),
    "",
    "Рекомендуется мягко пнуть их и попросить заполнить /anketa 🙂",
  ].join("\n");

  await ctx.replyWithHTML(text);
};
