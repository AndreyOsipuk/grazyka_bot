import type { Context, Telegraf } from "telegraf";

import { appType } from "../const";
import { userInviteLinks, userRequests } from "../core";
import { AppTypes } from "../types/types";
import { GROUP_ID } from "../utils";
import { BANNED_USER_MESSAGE, isBlocked } from "../utils/blocked";
import { generateNewInviteLink } from "../utils/generateNewInviteLink";
import { isUserInChat } from "../utils/isUserInChat";
import { sendRequestToAdmins } from "../utils/sendRequestToAdmins";

export const agreeRules = async (ctx: Context, bot: Telegraf) => {
  const user = ctx.from;
  const chat = ctx.chat;

  if (!user) return;
  if (!chat || chat.type !== "private") return;

  const userId = ctx.from.id;

  if (await isUserInChat(bot, GROUP_ID, user.id)) {
    await ctx.reply("✅ Вы уже состоите в чате.");
    return;
  }

  // Блокируем перезаход ТОЛЬКО тем, кого мы забанили намеренно (наш реестр).
  // Обычный кик (Combot/руками) оставляет в Telegram статус kicked, но в нашем
  // банлисте таких нет — им перезаход разрешаем.
  if (await isBlocked(userId)) {
    // Забаненному отвечаем ему самому и НЕ шумим в админ-группу —
    // иначе спамер задолбит админов повторными попытками.
    await ctx.editMessageText(BANNED_USER_MESSAGE);
    return;
  }

  // Если человека когда-то кикнули (в Telegram он kicked), но у нас он не в
  // бане — снимаем Telegram-кик, иначе он не сможет войти по ссылке.
  try {
    await ctx.telegram.unbanChatMember(GROUP_ID, userId, {
      only_if_banned: true,
    });
  } catch (e) {
    console.error("Не удалось снять kick перед вступлением:", e);
  }

  const data = userRequests.get(user.id) || {
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    request_count: 0,
  };
  data.agreed = true;
  userRequests.set(user.id, data);

  // Генерим новую инвайт-ссылку (однократную)
  const invite = await generateNewInviteLink(
    ctx,
    user.id,
    GROUP_ID,
    userInviteLinks,
  );

  if (appType == AppTypes.alco) {
    if (!invite?.invite_link) {
      return ctx.editMessageText(
        `❌ Ошибка генерации ссылки для ${user.first_name}`,
      );
    }

    await ctx.editMessageText("✅ Вы согласились с правилами!");

    const successMsg = [
      "🎉 Для вступления перейдите по ссылке:",
      invite.invite_link,
      "",
      "⚠️ <b>ВАЖНО:</b>",
      "",
      "🆘 Если ссылка не работает, запросите новую через /start",
    ].join("\n");

    await ctx.telegram.sendMessage(chat.id, successMsg, {
      parse_mode: "HTML",
    });
    return;
  }

  await ctx.editMessageText(
    "✅ Вы согласились с правилами! Запрос отправлен администраторам. Ожидайте одобрения.",
  );
  // Отправляем запрос админам
  await sendRequestToAdmins(ctx, user.id, invite?.invite_link, userRequests);
};
