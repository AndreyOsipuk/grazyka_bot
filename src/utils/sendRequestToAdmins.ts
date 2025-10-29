import { type Context, Markup } from "telegraf";

import type { UserRequest } from "../types";
import { ADMIN_GROUP_ID, TIME_LIMIT_MINUTES } from "./index";
import { pluralizeMinutesGenitive } from "./pluralizeMinutes";

export async function sendRequestToAdmins(
  ctx: Context,
  userId: number,
  inviteLink: string | undefined,
  userRequests: Map<number, UserRequest>,
) {
  const u = userRequests.get(userId);
  if (!u) return;

  let text = [
    "🔔 <b>Новый запрос на вступление в группу</b>",
    "",
    "<b>Информация о пользователе:</b>",
    `├ ID: <code>${userId}</code>`,
    `├ Имя: ${u.first_name || "—"}`,
    `├ Фамилия: ${u.last_name || "—"}`,
    `└ Username: @${u.username || "—"}`,
    `├ Запросов: ${u.request_count || 1}`,
    "",
    `⚠️ Пользователь согласился с правилами, включая требование первого сообщения в течение ${pluralizeMinutesGenitive(TIME_LIMIT_MINUTES)} минут.`,
  ].join("\n");

  if (inviteLink) {
    text += `\n\n🔗 <b>Новая ссылка сгенерирована</b>`;
  }

  const kb = Markup.inlineKeyboard([
    Markup.button.callback("✅ Одобрить", `approve_${userId}`),
    Markup.button.callback("❌ Отклонить", `reject_${userId}`),
  ]);

  try {
    const sent = await ctx.telegram.sendMessage(ADMIN_GROUP_ID, text, {
      parse_mode: "HTML",
      ...kb,
    });

    const prev = userRequests.get(userId) || {};
    userRequests.set(userId, {
      ...prev,
      adminMsg: { chatId: sent.chat.id, messageId: sent.message_id, text },
      status: "pending",
    });
  } catch (e) {
    console.error(`Ошибка отправки в ADMIN_GROUP_ID=${ADMIN_GROUP_ID}:`, e);
  }
}
