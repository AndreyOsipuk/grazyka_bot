import type { Context } from "telegraf";

import { profileDrafts } from "../../core";
import type { CommandContext } from "../../types/types";
import { escapeHtml } from "../index";
import { findUserIdByUsername } from "./findUserIdByUsername";
import { getProfile, saveProfile } from "./profiles";

export const startProfileWizard = async (ctx: Context) => {
  const user = ctx.from;
  const chat = ctx.chat;
  if (!user || !chat || chat.type !== "private") return;

  profileDrafts.set(user.id, { step: "gender" });

  await ctx.reply(
    "Давай заполним анкету.\n\nУкажи пол: м / ж / другое (можно написать как угодно, я сведу к m/f/x)",
  );
};

export const handleProfileWizardMessage = async (
  ctx: Context,
  next: () => Promise<void>,
  // eslint-disable-next-line sonarjs/cognitive-complexity
) => {
  const user = ctx.from;
  const chat = ctx.chat;
  if (!user || !chat || chat.type !== "private") return next();
  const text = (ctx.message as any)?.text?.trim();
  if (!text) return next();

  const draft = profileDrafts.get(user.id);
  if (!draft) return next(); // мастер не запущен

  if (draft.step === "gender") {
    const t = text.toLowerCase();
    let gender: "m" | "f" | "x" = "x";
    if (t.startsWith("м")) gender = "m";
    else if (t.startsWith("ж")) gender = "f";

    draft.gender = gender;
    draft.step = "age";
    profileDrafts.set(user.id, draft);
    await ctx.reply("Сколько тебе лет? (только число)");
    return;
  }

  if (draft.step === "age") {
    const age = parseInt(text, 10);
    if (Number.isNaN(age) || age < 16 || age > 99) {
      await ctx.reply("Напиши, пожалуйста, реальный возраст (16–99).");
      return;
    }
    draft.age = age;
    draft.step = "city";
    profileDrafts.set(user.id, draft);
    await ctx.reply("Из какого ты города?");
    return;
  }

  if (draft.step === "city") {
    draft.city = text;
    draft.step = "about";
    profileDrafts.set(user.id, draft);
    await ctx.reply(
      "Расскажи пару слов о себе (хобби, интересы, формат общения и т.п.)",
    );
    return;
  }

  if (draft.step === "about") {
    draft.about = text;

    if (!draft.gender || !draft.age || !draft.city || !draft.about) {
      await ctx.reply("Что-то пошло не так, попробуй ещё раз /anketa");
      profileDrafts.delete(user.id);
      return;
    }

    // сохраняем в Redis
    await saveProfile(user.id, {
      gender: draft.gender,
      age: draft.age,
      city: draft.city,
      about: draft.about,
    });

    profileDrafts.delete(user.id);

    const profileText = [
      "✅ Анкета сохранена:",
      "",
      // eslint-disable-next-line sonarjs/no-nested-conditional
      `Пол: ${draft.gender === "m" ? "мужской" : draft.gender === "f" ? "женский" : "другое/не указано"}`,
      `Возраст: ${draft.age}`,
      `Город: ${draft.city}`,
      "",
      `О себе: ${draft.about}`,
    ].join("\n");

    await ctx.reply(profileText);
  }
};

export const showMyProfile = async (ctx: Context) => {
  const user = ctx.from;
  const chat = ctx.chat;
  if (!user || !chat) return;

  const profile = await getProfile(user.id);
  if (!profile) {
    await ctx.reply(
      "У тебя пока нет анкеты. Напиши /anketa в личку боту, чтобы создать её.",
    );
    return;
  }

  const text = [
    `🧾 Твоя анкета:`,
    "",
    // eslint-disable-next-line sonarjs/no-nested-conditional
    `Пол: ${profile.gender === "m" ? "мужской" : profile.gender === "f" ? "женский" : "другое/не указано"}`,
    `Возраст: ${profile.age}`,
    `Город: ${profile.city}`,
    "",
    `О себе: ${profile.about}`,
  ].join("\n");

  await ctx.reply(text);
};

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
