import { userInviteLinks, userRequests } from "../core";
import type { ActionContext, MessageContext } from "../types/types";
import { GROUP_ID, isAdmin } from "../utils";
import { BANNED_USER_MESSAGE, blockUser } from "../utils/blocked";
import { resolveUserId } from "../utils/resolveUserId";

type BanInfo = {
  first_name?: string;
  last_name?: string;
  username?: string;
};

// Общее ядро бана: бан в группе + запись в реестр + уведомление пользователю.
// Используется и кнопкой «Забанить» в карточке, и командой /ban.
// Возвращает false, если сам banChatMember не прошёл (запись и уведомление
// всё равно выполняются).
export async function performBan(
  ctx: MessageContext | ActionContext,
  userId: number,
  info: BanInfo,
  adminName: string,
): Promise<boolean> {
  let banned = true;

  // Бан в группе — работает и для тех, кто ещё не вступил. Это «шлагбаум»:
  // после бана agreeRules не пропустит повторные запросы.
  try {
    await ctx.telegram.banChatMember(GROUP_ID, userId);
  } catch (e) {
    banned = false;
    console.error("Ошибка бана пользователя:", e);
  }

  try {
    await blockUser(userId, {
      first_name: info.first_name || "",
      last_name: info.last_name || "",
      username: info.username || "",
      blocked_by: adminName,
    });
  } catch (e) {
    console.error("Ошибка записи в реестр забаненных:", e);
  }

  userInviteLinks.delete(userId);

  try {
    await ctx.telegram.sendMessage(userId, BANNED_USER_MESSAGE);
  } catch (e) {
    console.error("Ошибка отправки уведомления о бане:", e);
  }

  return banned;
}

// Достаёт id и инфо цели из reply или аргумента (@username / id).
async function resolveBanTarget(
  ctx: MessageContext,
  reply: MessageContext["message"]["reply_to_message"],
  arg: string | undefined,
): Promise<{ userId: number | null; info: BanInfo }> {
  if (reply?.from) {
    return {
      userId: reply.from.id,
      info: {
        first_name: reply.from.first_name,
        last_name: reply.from.last_name,
        username: reply.from.username,
      },
    };
  }

  if (!arg) return { userId: null, info: {} };

  const userId = await resolveUserId(arg);
  if (!userId) return { userId: null, info: {} };

  const info: BanInfo = {};
  // добираем имя/username для реестра (best-effort)
  try {
    const m = await ctx.telegram.getChatMember(GROUP_ID, userId);
    if (m?.user) {
      info.first_name = m.user.first_name;
      info.last_name = m.user.last_name;
      info.username = m.user.username;
    }
  } catch {
    // не нашли участника — банить можно и по голому id
  }
  // если резолвили по @username, а getChatMember ника не дал — берём из аргумента
  if (!info.username && arg.startsWith("@")) {
    info.username = arg.slice(1);
  }

  return { userId, info };
}

export const ban = async (ctx: MessageContext) => {
  const admin = ctx.message.from;
  if (!isAdmin(admin.id)) {
    return;
  }

  const reply = ctx.message?.reply_to_message;
  const arg = (ctx.message?.text || "").split(/\s+/)[1]?.trim();

  const { userId, info } = await resolveBanTarget(ctx, reply, arg);

  if (!userId) {
    return ctx.reply(
      [
        "Использование:",
        "• Ответьте /ban на сообщение пользователя",
        "• или /ban &lt;user_id&gt; (числом)",
        "• или /ban @username",
        "",
        arg ? "Не нашёл такого пользователя. Попробуйте по числовому id." : "",
      ]
        .filter(Boolean)
        .join("\n"),
      { parse_mode: "HTML" },
    );
  }

  const rec = userRequests.get(userId) || {};
  rec.approved = false;
  rec.status = "blocked";
  userRequests.set(userId, rec);

  const ok = await performBan(
    ctx,
    userId,
    info,
    admin.first_name || String(admin.id),
  );

  await ctx.reply(
    ok
      ? `🚫 Пользователь <code>${userId}</code> забанен.`
      : `⚠️ Записал в бан, но banChatMember не прошёл (подробности в логах): <code>${userId}</code>.`,
    { parse_mode: "HTML" },
  );
};

// Бан по инлайн-кнопке (например, из /whois в общем чате). В отличие от
// approveReject, не требует заявки в userRequests — банит любого по id.
export const quickBan = async (ctx: ActionContext) => {
  const admin = ctx.from;
  if (!admin || !isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }

  const targetId = Number(ctx.match[1]);

  let info: BanInfo = {};
  try {
    const m = await ctx.telegram.getChatMember(GROUP_ID, targetId);
    if (m?.user) {
      info = {
        first_name: m.user.first_name,
        last_name: m.user.last_name,
        username: m.user.username,
      };
    }
  } catch {
    // не нашли участника — банить можно и по голому id
  }

  const rec = userRequests.get(targetId) || {};
  rec.approved = false;
  rec.status = "blocked";
  userRequests.set(targetId, rec);

  const ok = await performBan(
    ctx,
    targetId,
    info,
    admin.first_name || String(admin.id),
  );

  await ctx.answerCbQuery(
    ok ? "Забанен" : "Бан записан, но banChatMember не прошёл",
    { show_alert: !ok },
  );

  try {
    await ctx.editMessageReplyMarkup(undefined);
  } catch {
    // разметку могли уже убрать — не критично
  }
};
