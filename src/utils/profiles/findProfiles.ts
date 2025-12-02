import type { CommandContext } from "../../types/types";
import { escapeHtml, GROUP_ID } from "../index";
import { getAllProfileUserIds, getProfile } from "./profiles";

export const findProfiles = async (ctx: CommandContext) => {
  const chat = ctx.chat;
  const from = ctx.from;
  if (!from || !chat) return;

  const text = ctx.message?.text ?? "";
  const [, ...args] = text.split(/\s+/);

  if (args.length < 3) {
    return ctx.reply(
      "Использование:\n" +
        "/find_profiles <пол m/f/x> <minAge> <maxAge> <город>\n\n" +
        "Например:\n/find_profiles f 25 35 москва",
    );
  }

  const gender = args[0].toLowerCase() as "m" | "f" | "x";
  const minAge = parseInt(args[1], 10);
  const maxAge = parseInt(args[2], 10);
  const cityQuery = args.slice(3).join(" ").toLowerCase();

  if (
    !["m", "f", "x"].includes(gender) ||
    Number.isNaN(minAge) ||
    Number.isNaN(maxAge)
  ) {
    return ctx.reply(
      "Неверные параметры.\nПример: /find_profiles f 25 35 москва",
    );
  }

  const ids = await getAllProfileUserIds();
  const results: {
    id: string;
    gender: string;
    age: number;
    city: string;
    about: string;
  }[] = [];

  for (const id of ids) {
    const profile = await getProfile(id);
    if (!profile) continue;

    if (gender !== "x" && profile.gender !== gender) continue;
    if (profile.age < minAge || profile.age > maxAge) continue;
    if (cityQuery && !profile.city.toLowerCase().includes(cityQuery)) continue;

    results.push({
      id,
      gender: profile.gender,
      age: profile.age,
      city: profile.city,
      about: profile.about,
    });
  }

  const isPrivate = chat.type === "private";
  const isGroup = chat.id === GROUP_ID;

  if (results.length === 0) {
    return ctx.reply("Никого не найдено 🙁");
  }

  //
  // === ЛИЧКА — выдаём полный текст ===
  //
  if (isPrivate) {
    const full = results
      .map((p) =>
        [
          `👤 <a href="tg://user?id=${p.id}">${escapeHtml(p.id)}</a>`,
          `Пол: ${p.gender}`,
          `Возраст: ${p.age}`,
          `Город: ${escapeHtml(p.city)}`,
          "",
          `О себе: ${escapeHtml(p.about)}`,
        ].join("\n"),
      )
      .join("\n\n———\n\n");

    return ctx.replyWithHTML(
      `🔎 Найдено анкет: <b>${results.length}</b>\n\n${full}`,
    );
  }

  //
  // === ГРУППА — даём короткий формат и ограничиваем вывод ===
  //
  if (isGroup) {
    const limited = results.slice(0, 10);

    const short = limited
      .map(
        (p) =>
          `• <a href="tg://user?id=${p.id}">${escapeHtml(
            p.id,
          )}</a> — ${p.age} лет, ${escapeHtml(p.city)}`,
      )
      .join("\n");

    const extra =
      results.length > 10
        ? `\n\n…и ещё ${results.length - 10}.\nОткройте анкету в личке → напишите боту /find_profiles`
        : "";

    return ctx.replyWithHTML(
      `🔎 Найдено: <b>${results.length}</b>\n\n${short}${extra}`,
    );
  }

  return ctx.reply("Поиск анкет доступен только в ЛС и основном чате.");
};
