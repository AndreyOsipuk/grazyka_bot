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
      { command: "suggest", description: "Предложить мем в канал" },
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

  // allowedUpdates нужно перечислять полностью — chat_member по умолчанию
  // Telegram не шлёт, а он нужен для синка выхода/кика участников.
  const startPolling = () => {
    bot
      .launch({
        allowedUpdates: [
          "message",
          "edited_message",
          "callback_query",
          "my_chat_member",
          "chat_member",
        ],
      })
      .catch((e) => {
        // 409 Conflict бывает при рестарте: старый инстанс ещё держит getUpdates.
        // Не падаем (иначе pm2 крутит краш-луп) — ждём и пробуем снова.
        const code = (e as { response?: { error_code?: number } })?.response
          ?.error_code;
        console.error(
          `Ошибка поллинга (${code ?? "?"}), повтор через 5с:`,
          (e as Error)?.message || e,
        );
        setTimeout(startPolling, 5000);
      });
  };

  startPolling();
  console.log("✅ Бот запущен (Telegraf, polling).");
};
