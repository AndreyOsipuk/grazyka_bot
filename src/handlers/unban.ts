import { silenceTimers, userInviteLinks, userRequests } from "../core";
import type { ActionContext, MessageContext } from "../types/types";
import { GROUP_ID, isAdmin } from "../utils";
import { unblockUser } from "../utils/blocked";
import { clearSilenceTimer } from "../utils/clearSilenceTimer";

// Снимает бан в группе и чистит локальное состояние/реестр. Возвращает true при успехе.
async function doUnban(
  ctx: MessageContext | ActionContext,
  userId: number,
): Promise<boolean> {
  try {
    await ctx.telegram.unbanChatMember(GROUP_ID, userId, {
      only_if_banned: true,
    });
  } catch (e) {
    console.error("Ошибка разбана пользователя:", e);
    return false;
  }

  await unblockUser(userId);
  userRequests.delete(userId);
  userInviteLinks.delete(userId);
  clearSilenceTimer(userId, silenceTimers);
  return true;
}

export const unban = async (ctx: MessageContext) => {
  if (!isAdmin(ctx.message.from.id)) {
    return;
  }

  const reply = ctx.message?.reply_to_message;
  const arg = (ctx.message?.text || "").split(/\s+/)[1]?.trim();

  let userId: number | null = null;
  if (reply?.from) {
    userId = reply.from.id;
  } else if (arg && /^\d+$/.test(arg)) {
    userId = Number(arg);
  }

  if (!userId) {
    return ctx.reply(
      [
        "Использование:",
        "• Ответьте /unban на сообщение пользователя",
        "• или /unban <user_id> (числом)",
      ].join("\n"),
    );
  }

  const ok = await doUnban(ctx, userId);
  await ctx.reply(
    ok
      ? `✅ Пользователь <code>${userId}</code> разблокирован.`
      : `❌ Не удалось разблокировать <code>${userId}</code>. Подробности в логах.`,
    { parse_mode: "HTML" },
  );
};

export const unblockAction = async (ctx: ActionContext) => {
  const admin = ctx.from;
  if (!admin || !isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }

  const targetId = Number(ctx.match[1]);
  const ok = await doUnban(ctx, targetId);

  await ctx.answerCbQuery(ok ? "Разблокирован" : "Не удалось разблокировать", {
    show_alert: !ok,
  });

  if (ok) {
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {
      // разметку могли уже убрать — не критично
    }
  }
};
