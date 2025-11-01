import type { Telegraf } from "telegraf";

import { ADMIN_GROUP_ID, GROUP_ID } from "./index";

export const launch = async (bot: Telegraf) => {
  await bot.telegram.setMyCommands(
    [{ command: "start", description: "Начать" }],
    { scope: { type: "all_private_chats" } },
  );

  await bot.telegram.setMyCommands(
    [
      { command: "start", description: "Начать" },
      {
        command: "whois",
        description: "Инфо о пользователе (reply или /whois <id>)",
      },
      { command: "chatid", description: "Показать ID чата" },
    ],
    { scope: { type: "chat", chat_id: ADMIN_GROUP_ID } },
  );

  await bot.telegram.setMyCommands(
    [
      {
        command: "report",
        description: "Сообщить о нарушении (reply на сообщение)",
      },
    ],
    { scope: { type: "chat", chat_id: GROUP_ID } },
  );

  try {
    bot.launch();
    console.log("✅ Бот запущен (Telegraf, polling).");
  } catch (e) {
    console.log("Ошибка запуска", e);
  }
};
