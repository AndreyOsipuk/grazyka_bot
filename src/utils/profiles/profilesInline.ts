import type { Context } from "telegraf";

import type { CommandContext } from "../../types/types";
import { escapeHtml, GROUP_ID } from "../index";
import { getAllProfileUserIds, getProfile } from "./profiles";

export const profilesInlineStart = async (ctx: CommandContext) => {
  const text =
    "Выберите фильтр для поиска анкет:\n\n" +
    "Фильтры примерные, для более точного поиска используйте /find_profiles.";

  await ctx.reply(text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "👩 F 18–25", callback_data: "profiles:g=f:a=18-25" },
          { text: "👩 F 26–35", callback_data: "profiles:g=f:a=26-35" },
          { text: "👩 F 36+", callback_data: "profiles:g=f:a=36-99" },
        ],
        [
          { text: "👨 M 18–25", callback_data: "profiles:g=m:a=18-25" },
          { text: "👨 M 26–35", callback_data: "profiles:g=m:a=26-35" },
          { text: "👨 M 36+", callback_data: "profiles:g=m:a=36-99" },
        ],
        [
          { text: "Все 18–30", callback_data: "profiles:g=x:a=18-30" },
          { text: "Все 30–45", callback_data: "profiles:g=x:a=30-45" },
        ],
      ],
    },
  });
};

export const profilesInlineFilter = async (ctx: Context) => {
  if (!("callbackQuery" in ctx) || !ctx.callbackQuery) return;
  const cb: any = ctx.callbackQuery;
  const data: string | undefined = cb.data;
  if (!data || !data.startsWith("profiles:")) return;

  // eslint-disable-next-line sonarjs/single-character-alternation
  const m = data.match(/^profiles:g=(m|f|x):a=(\d+)-(\d+)$/);
  if (!m) {
    return ctx.answerCbQuery?.("Неверный формат фильтра", { show_alert: true });
  }

  const gender = m[1] as "m" | "f" | "x";
  const minAge = parseInt(m[2], 10);
  const maxAge = parseInt(m[3], 10);

  const ids = await getAllProfileUserIds();
  const results: { id: string; age: number; city: string }[] = [];

  for (const id of ids) {
    const profile = await getProfile(id);
    if (!profile) continue;
    if (gender !== "x" && profile.gender !== gender) continue;
    if (profile.age < minAge || profile.age > maxAge) continue;

    results.push({
      id,
      age: profile.age,
      city: profile.city,
    });
  }

  const chat = ctx.chat;
  const isGroup = chat && chat.id === GROUP_ID;

  if (results.length === 0) {
    await ctx.editMessageText("Никого по такому фильтру не нашлось 🙁");
    return ctx.answerCbQuery?.("Пусто", { show_alert: false });
  }

  const limited = isGroup ? results.slice(0, 10) : results;
  const lines = limited.map(
    (p) =>
      `• <a href="tg://user?id=${p.id}">${escapeHtml(
        p.id,
      )}</a> — ${p.age} лет, ${escapeHtml(p.city)}`,
  );

  const extra =
    isGroup && results.length > limited.length
      ? `\n\n…и ещё ${results.length - limited.length}. Для полного списка используйте /find_profiles в личке.`
      : "";

  await ctx.editMessageText(
    [`🔎 Найдено анкет: ${results.length}`, "", lines.join("\n"), extra].join(
      "\n",
    ),
    { parse_mode: "HTML" },
  );

  await ctx.answerCbQuery?.();
};
