import type { MessageContext } from "../types";
import { isAdmin } from "../utils";

export const whois = async (ctx: MessageContext) => {
  if (!isAdmin(ctx.message.from.id)) {
    return;
  }

  const reply = ctx.message?.reply_to_message;
  const arg = (ctx.message?.text || "").split(/\s+/)[1]?.trim();
  let user = null;

  if (reply?.from) {
    user = reply.from;
  }

  if (!user && arg && /^\d+$/.test(arg)) {
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, Number(arg));
      user = member?.user || null;
    } catch {
      // не нашли участника или бот не видит юзера в этом чате
    }
  }

  if (!user) {
    return ctx.reply(
      [
        "Использование:",
        "• Ответьте /whois на сообщение пользователя",
        "• или /whois <user_id> (числом)",
        "",
        "Подсказка: @username нельзя резолвить через Bot API для приватных пользователей.",
      ].join("\n"),
    );
  }

  await ctx.reply(
    [
      `ID: <code>${user.id}</code>`,
      `Имя: ${user.first_name || "—"} ${user.last_name || ""}`.trim(),
      `Username: @${user.username || "—"}`,
      `Is bot: ${user.is_bot ? "yes" : "no"}`,
    ].join("\n"),
    { parse_mode: "HTML" },
  );
};
