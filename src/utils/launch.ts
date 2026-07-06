import type { Telegraf } from "telegraf";

import { appType } from "../const";
import { AppTypes } from "../types/types";
import { ADMIN_GROUP_ID, GROUP_ID } from "./index";

export const launch = async (bot: Telegraf) => {
  // === 1️⃣ Команды в ЛИЧКЕ у бота ===
  await bot.telegram.setMyCommands(
    [
      { command: "start", description: "Начать" },
      { command: "help", description: "Список команд" },
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
        { command: "help", description: "Список всех команд" },
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
        {
          command: "ban",
          description: "Забанить (reply / id / @username)",
        },
        {
          command: "unban",
          description: "Разбанить (reply / id / @username)",
        },
        { command: "banned", description: "Список забаненных" },
        {
          command: "memeban",
          description: "Запретить слать мемы (reply / id / @username)",
        },
        {
          command: "memeunban",
          description: "Вернуть право на мемы (reply / id / @username)",
        },
        { command: "memebanned", description: "Список забаненных по мемам" },
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

  // === 4️⃣ Команды для АДМИНОВ в основном чате (видят только админы) ===
  if (appType === AppTypes.gryzuka) {
    await bot.telegram.setMyCommands(
      [
        { command: "help", description: "Список всех команд" },
        {
          command: "whois",
          description: "Узнать ID пользователя (reply или /whois <id>)",
        },
        {
          command: "ban",
          description: "Забанить (reply / id / @username)",
        },
        {
          command: "unban",
          description: "Разбанить (reply / id / @username)",
        },
        { command: "banned", description: "Список забаненных" },
        {
          command: "memeban",
          description: "Запретить слать мемы (reply на мем)",
        },
        {
          command: "memeunban",
          description: "Вернуть право на мемы (reply / id / @username)",
        },
        { command: "memebanned", description: "Список забаненных по мемам" },
      ],
      { scope: { type: "chat_administrators", chat_id: GROUP_ID } },
    );
  }

  try {
    bot.launch();
    console.log("✅ Бот запущен (Telegraf, polling).");
  } catch (e) {
    console.log("Ошибка запуска", e);
  }
};
