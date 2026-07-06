import type { MessageContext } from "../types/types";
import { ADMIN_GROUP_ID, isAdmin } from "../utils";

// Полный список для админов (в админ-группе или админам где угодно).
const ADMIN_HELP = [
  "📋 <b>Команды бота</b>",
  "",
  "<b>👮 Модерация чата</b>",
  "/ban - забанить (reply / id / @username)",
  "/unban - разбанить (reply / id / @username)",
  "/banned - список забаненных",
  "/whois - узнать ID пользователя (reply / id)",
  "",
  "<b>🖼 Мемы</b>",
  "/memeban - запретить слать мемы (reply / id / @username)",
  "/memeunban - вернуть право на мемы",
  "/memebanned - список забаненных по мемам",
  "",
  "<b>📝 Анкеты</b>",
  "/anketa - создать или обновить анкету",
  "/myprofile - моя анкета",
  "/profile - анкета пользователя (reply / @)",
  "/profiles - поиск анкет кнопками",
  "/find_profiles - поиск анкет (фильтры)",
  "/noprof - кто без анкеты",
  "/delprofile - удалить анкету (reply)",
  "",
  "<b>ℹ️ Прочее</b>",
  "/stats - статистика / дата последнего сообщения",
  "/rules - показать правила",
  "/report - пожаловаться на сообщение (reply)",
  "/chatid - ID чата (в логи)",
  "/reset - сбросить свои запросы",
].join("\n");

// Краткий список для обычных пользователей.
const USER_HELP = [
  "📋 <b>Команды</b>",
  "",
  "/start - начать / правила",
  "/rules - правила группы",
  "/anketa - создать или обновить анкету",
  "/myprofile - моя анкета",
  "/find_profiles - поиск анкет",
  "/report - пожаловаться на сообщение (reply)",
].join("\n");

export const help = async (ctx: MessageContext) => {
  const inAdminGroup = ctx.chat?.id === ADMIN_GROUP_ID;
  const text =
    inAdminGroup || isAdmin(ctx.message.from.id) ? ADMIN_HELP : USER_HELP;
  await ctx.reply(text, { parse_mode: "HTML" });
};
