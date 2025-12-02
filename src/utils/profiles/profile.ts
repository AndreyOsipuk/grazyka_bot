import type { CommandContext } from "../../types/types";
import { escapeHtml } from "../index";
import { findUserIdByUsername } from "./findUserIdByUsername";
import { getProfile } from "./profiles";

export const showUserProfile = async (ctx: CommandContext) => {
  const from = ctx.from;
  if (!from) return;

  const text = ctx.message?.text ?? "";
  const [, arg] = text.split(/\s+/, 2);

  let targetId: number | null = null;
  let targetUsername: string | null = null;
  let targetName: string | null = null;

  const reply = ctx.message?.reply_to_message;
  if (reply?.from) {
    targetId = reply.from.id;
    targetUsername = reply.from.username || null;
    targetName = reply.from.first_name || null;
  } else if (arg) {
    // 2️⃣ Если указали @username или id
    const found = await findUserIdByUsername(arg);
    if (found) {
      targetId = found.id;
      targetUsername = found.username || null;
      targetName = found.first_name || null;
    }
  }

  if (!targetId) {
    return ctx.reply(
      "Использование:\n/profile @username\nили ответом на сообщение пользователя.",
    );
  }

  const profile = await getProfile(targetId);
  if (!profile) {
    return ctx.reply("У этого пользователя пока нет анкеты.");
  }

  const genderText =
    profile.gender === "m"
      ? "мужской"
      : // eslint-disable-next-line sonarjs/no-nested-conditional
        profile.gender === "f"
        ? "женский"
        : "другое / не указано";

  // 🧩 Формируем отображаемое имя
  let userDisplay: string;
  if (targetUsername) {
    userDisplay = `<a href="https://t.me/${targetUsername}">@${targetUsername}</a>`;
  } else {
    const name = escapeHtml(targetName || "пользователь");
    userDisplay = `<a href="tg://user?id=${targetId}">${name}</a>`;
  }

  const textProfile = [
    `🧾 Анкета ${userDisplay}`,
    "",
    `Пол: ${genderText}`,
    `Возраст: ${profile.age}`,
    `Город: ${escapeHtml(profile.city)}`,
    "",
    `О себе: ${escapeHtml(profile.about)}`,
  ].join("\n");

  await ctx.replyWithHTML(textProfile);
};
