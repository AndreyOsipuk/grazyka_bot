import type { CommandContext } from "../../types/types";
import { escapeHtml, isAdmin } from "../index";
import { deleteProfile } from "./profiles";

export const deleteProfileByAdmin = async (ctx: CommandContext) => {
  const chat = ctx.chat;
  const from = ctx.from;
  if (!chat || !from) return;

  if (!isAdmin(from.id)) {
    return ctx.reply("🚫 Только админы могут удалять анкеты.");
  }

  let targetId: number | null = null;

  const reply = ctx.message?.reply_to_message;
  if (reply?.from?.id) {
    targetId = reply.from.id;
  } else {
    const [, arg] = ctx.message?.text.split(" ") || [];
    if (arg?.startsWith("@")) {
      // тут можно найти id по username из Redis, если хочешь
      // для MVP можно просто сказать "пока только через reply"
      return ctx.reply(
        "Пока удаление анкеты работает только через reply на сообщение пользователя.",
      );
    }
  }

  if (!targetId) {
    return ctx.reply(
      "Сделай /delprofile ответом на сообщение пользователя, чью анкету нужно удалить.",
    );
  }

  await deleteProfile(targetId);

  await ctx.replyWithHTML(
    `🧹 Анкета пользователя <a href="tg://user?id=${targetId}">${escapeHtml(
      String(targetId),
    )}</a> удалена.`,
  );
};
