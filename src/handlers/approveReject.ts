import { userInviteLinks, userRequests } from "../core";
import type { ActionContext } from "../types/types";
import {
  ADMIN_GROUP_ID,
  GROUP_ID,
  isAdmin,
  TIME_LIMIT_MINUTES,
} from "../utils";
import { closeAdminRequest } from "../utils/closeAdminRequest";
import { generateNewInviteLink } from "../utils/generateNewInviteLink";
import { pluralizeMinutesGenitive } from "../utils/pluralizeMinutes";
import { performBan } from "./ban";

// Регекс callback-кнопок карточки запроса. Экспортируется, чтобы bot.ts и тесты
// использовали один источник правды.
export const APPROVE_REJECT_BAN_RE = /^(approve|reject|ban)_(\d+)$/;

// eslint-disable-next-line sonarjs/cognitive-complexity
export const approveReject = async (ctx: ActionContext) => {
  const user = ctx.from;
  const chat = ctx.chat;

  if (!user) return;
  if (!chat) return;

  if (ctx.chat?.id !== ADMIN_GROUP_ID) {
    return;
  }

  const admin = ctx.from;
  if (!isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }

  const [, action, targetIdStr] = ctx.match;
  const targetId = Number(targetIdStr);
  const userInfo = userRequests.get(targetId);

  if (!userInfo) {
    return ctx.editMessageText("❌ Пользователь не найден или запрос устарел.");
  }

  if (userInfo.status && userInfo.status !== "pending") {
    const statusLabels: Record<string, string> = {
      approved: "одобрена",
      blocked: "заблокирована",
      rejected: "отклонена",
    };
    const statusLabel = statusLabels[userInfo.status] || "обработана";
    return ctx.answerCbQuery(`Заявка уже ${statusLabel}.`, {
      show_alert: true,
    });
  }

  if (action === "approve") {
    userInfo.approved = true;
    userInfo.status = "approved";
    userRequests.set(targetId, userInfo);

    const invite = await generateNewInviteLink(
      ctx,
      targetId,
      GROUP_ID,
      userInviteLinks,
    );
    if (!invite?.invite_link) {
      return ctx.editMessageText(
        `❌ Ошибка генерации ссылки для ${userInfo.first_name || targetId}`,
      );
    }

    await closeAdminRequest(
      ctx,
      targetId,
      userRequests,
      `✅ Запрос от ${userInfo.first_name || targetId} (ID: <code>${targetId}</code>) одобрен администратором ${admin.first_name}\n🔗 Новая ссылка отправлена пользователю`,
    );

    const successMsg = [
      "🎉 Ваш запрос одобрен!",
      "",
      "Добро пожаловать в нашу группу!",
      "",
      "Для вступления перейдите по ссылке:",
      invite.invite_link,
      "",
      "⚠️ <b>ВАЖНО:</b>",
      "• Ссылка действительна только для одного использования",
      `• После вступления напишите любое сообщение в группе в течение ${pluralizeMinutesGenitive(TIME_LIMIT_MINUTES)}!`,
      "• Иначе вы будете автоматически забанены",
      "",
      "🆘 Если ссылка не работает, запросите новую через /start",
    ].join("\n");

    try {
      await ctx.telegram.sendMessage(targetId, successMsg, {
        parse_mode: "HTML",
      });
    } catch (e) {
      const err = e as Error;
      console.error("Ошибка отправки инвайта пользователю:", e);

      await ctx.telegram.sendMessage(
        ADMIN_GROUP_ID,
        `❌ Ошибка отправки ссылки пользователю: ${err.message || e}`,
      );
    }
  } else if (action === "ban") {
    userInfo.approved = false;
    userInfo.status = "blocked";
    userRequests.set(targetId, userInfo);

    await performBan(
      ctx,
      targetId,
      userInfo,
      admin.first_name || String(admin.id),
    );

    await closeAdminRequest(
      ctx,
      targetId,
      userRequests,
      `🚫 Пользователь ${userInfo.first_name || targetId} (ID: <code>${targetId}</code>) забанен администратором ${admin.first_name}`,
    );
  } else {
    // reject
    userInviteLinks.delete(targetId);
    userInfo.approved = false;
    userInfo.status = "rejected";
    userRequests.set(targetId, userInfo);

    await closeAdminRequest(
      ctx,
      targetId,
      userRequests,
      `❌ Запрос от ${userInfo.first_name || targetId} (ID: <code>${targetId}</code>) отклонен администратором ${admin.first_name}`,
    );

    try {
      await ctx.telegram.sendMessage(
        targetId,
        "❌ Ваш запрос на вступление в группу был отклонен администратором.\n\nЕсли хотите попробовать снова, используйте /start",
      );
    } catch (e) {
      console.error("Ошибка отправки уведомления об отклонении:", e);

      await ctx.telegram.sendMessage(
        ADMIN_GROUP_ID,
        `❌ Ошибка отправки уведомления об отклонении`,
      );
    }
  }
};
