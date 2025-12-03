import type { Telegraf } from "telegraf";

export async function isUserInChat(
  bot: Telegraf,
  chatId: number | string,
  userId: number,
): Promise<boolean> {
  try {
    const member = await bot.telegram.getChatMember(chatId, userId);

    // Возможные статусы:
    // "creator", "administrator", "member", "restricted", "left", "kicked"
    return (
      member.status === "creator" ||
      member.status === "administrator" ||
      member.status === "member" ||
      member.status === "restricted"
    );
  } catch (err: any) {
    // Если бот не видит пользователя (он не в чате)
    if (
      err.response?.error_code === 400 &&
      /user not found|chat member not found|Bad Request/i.test(err.description)
    ) {
      return false;
    }
    console.error("Ошибка при проверке пользователя:", err);
    return false;
  }
}
