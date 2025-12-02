import type { Telegraf } from "telegraf";

import { appType } from "../const";
import { AppTypes } from "../types/types";
import { ADMIN_GROUP_ID, GROUP_ID } from "./index";

export const launch = async (bot: Telegraf) => {
  // === 1️⃣ Команды в ЛИЧКЕ у бота ===
  await bot.telegram.setMyCommands(
    [
      { command: "start", description: "Начать" },
      { command: "rules", description: "Показать правила группы" },
      { command: "anketa", description: "Создать или обновить анкету" },
      { command: "myprofile", description: "Показать мою анкету" },
      {
        command: "find_profiles",
        description: "Поиск анкет (пол, возраст, город)",
      },
    ],
    { scope: { type: "all_private_chats" } },
  );

  // === 2️⃣ Команды в АДМИНСКОМ ЧАТЕ ===
  if (appType === AppTypes.gryzuka) {
    await bot.telegram.setMyCommands(
      [
        { command: "start", description: "Начать" },
        { command: "rules", description: "Показать правила группы" },
        {
          command: "whois",
          description: "Инфо о пользователе (reply или /whois <id>)",
        },
        { command: "chatid", description: "Показать ID чата" },
        {
          command: "stats",
          description: "Показать статистику или дату последнего сообщения",
        },
        {
          command: "noprof",
          description: "Показать пользователей без анкет",
        },
        { command: "anketa", description: "Создать или обновить анкету" },
        { command: "myprofile", description: "Моя анкета" },
        { command: "profile", description: "Показать анкету пользователя" },
        { command: "profiles", description: "Поиск анкет через кнопки" },
        { command: "find_profiles", description: "Поиск анкет (фильтры)" },
        { command: "matchme", description: "Подбор совместимых людей" },
        {
          command: "delprofile",
          description: "Удалить анкету (reply)",
        },
      ],
      { scope: { type: "chat", chat_id: ADMIN_GROUP_ID } },
    );
  }

  // === 3️⃣ Команды в ОСНОВНОМ ЧАТЕ ===
  await bot.telegram.setMyCommands(
    [
      {
        command: "report",
        description: "Сообщить о нарушении (reply на сообщение)",
      },
      { command: "rules", description: "Показать правила группы" },
      { command: "report", description: "Пожаловаться на сообщение (в чате)" },
      {
        command: "stats",
        description: "Показать статистику или дату последнего сообщения",
      },
      {
        command: "noprof",
        description: "Показать пользователей без анкет",
      },
      { command: "find_profiles", description: "Поиск анкет" },
      { command: "profiles", description: "Поиск анкет через кнопки" },
      { command: "profile", description: "Посмотреть анкету (reply/@)" },
      { command: "matchme", description: "Подбор совместимых людей" },
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
