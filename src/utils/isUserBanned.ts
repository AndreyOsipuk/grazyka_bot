import type { Context } from "telegraf";

export async function isUserBanned(
  ctx: Context,
  groupId: number,
  userId: number,
): Promise<boolean> {
  try {
    const m = await ctx.telegram.getChatMember(groupId, userId);
    return m.status === "kicked";
  } catch (e: any) {
    // 400: "Bad Request: user not found" — бот не видит историю пользователя в чате
    if (e?.response?.error_code === 400) return false;
    // Пробрасываем прочие сетевые ошибки
    throw e;
  }
}
