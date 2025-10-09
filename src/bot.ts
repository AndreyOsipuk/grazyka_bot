import { isUserInChat } from "./utils/isUserInChat";

console.log("ENTRY OK");

import "dotenv/config";

import { Markup, Telegraf } from "telegraf";
import pkg from "telegraf/filters";

import type { UserRequest } from "./types";
import {
  ADMIN_GROUP_ID,
  BOT_TOKEN,
  escapeHtml,
  GROUP_ID,
  isAdmin,
  TIME_LIMIT_MINUTES,
} from "./utils";
import { banUserForSilence } from "./utils/banUserForSilence";
import { clearSilenceTimer } from "./utils/clearSilenceTimer";
import { closeAdminRequest } from "./utils/closeAdminRequest";
import { generateNewInviteLink } from "./utils/generateNewInviteLink";
import { isUserBanned } from "./utils/isUserBanned";
import { messageHasPhoto } from "./utils/messageHasPhoto";
import { pluralizeMinutes } from "./utils/pluralizeMinutes";
import { sendRequestToAdmins } from "./utils/sendRequestToAdmins";

const { message } = pkg;

if (!ADMIN_GROUP_ID) throw new Error("ADMIN_GROUP_ID is required in .env");
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required in .env");
if (!GROUP_ID) throw new Error("GROUP_ID is required in .env");

const welcomeMsgs = new Map<number, { chatId: number; messageId: number }>();
const userRequests = new Map<number, UserRequest>();
const userJoinTimes = new Map<number, Date>();
const userFirstMessages = new Map<number, boolean>();
const userInviteLinks = new Map<
  number,
  { link: string; created_at: Date; used: boolean; used_at?: Date }
>();
const silenceTimers = new Map<number, ReturnType<typeof setTimeout>>();

console.log("🔑 BOT_TOKEN найден, создаём экземпляр бота...");
const bot = new Telegraf(BOT_TOKEN);

const rulesText = `
<b>Основные положения.</b>

1. Чат создан для обсуждения всех видов юмора 18+, дружеского общения, а так же любительской и домашней эротики.
2. Чат строго 18+. При добавлении в чат участник должен кратко рассказать о себе, в том числе отправить мем 18+, или свое фото.
Зайти и "Просто посмотреть" не выйдет :)
3. Все участники чата должны быть готовы участвовать в жизни сообщества и общении. При отсутствии активности в течение 15 дней идёт автоматический бан.
4. Заявки на добавление в чат принимаются от всех желающих, но итоговое решение о добавлении принимается администрацией чата.
5. Добавление в чат производится по ссылке после прочтения правил и нажатия на кнопку.

<b>Правила общения в чате.</b>

1. Общение в чате производится текстовыми сообщениями, аудио и видео сообщениями. Злоупотребление видеосообщениями, аудио сообщениями (больше 5 штук подряд), стикерами караются мьютом. При повторении инцидента следует бан.
2. Общение происходит в уважительной форме, соблюдая правила этики и лексики.
3. Фотографии и контент 18+ для всеобщего комфорта следует прятать за шторку/спойлер.
4. Горячая тема для обсуждения фиксируется администраторами в закрепе.

<b>Запреты и баны.</b>

1. В чате запрещено неуважительное отношение к собеседникам или выражение любого рода расовой, половой и прочей дискриминации.
2. Запрещено писать в личные сообщения участникам без получения разрешения от них в чате: при однократных жалобах идёт предупреждение, при повторении инцидента — бан.
3. В чате используются настройки запрещающие пересылку и копирование информации через мессенджер.
Но! Запрещено любого рода копирование и передача информации из переписки в чате в сторонние ресурсы и любое использование переписки на стороне по средствам фиксации на второй телефон, скриншоты с компьютера и тд.
4. Использование мемов, картинок, видеороликов, фото, связанных с детской эротикой/порнографией запрещено и карается перманентным баном.
5. Администраторы имеют право отправить участника в бан или мьют на неопределенный срок за несоблюдение регламента, а также по своему усмотрению.
Незнание правил не освобождает от ответственности :)

При вхождении в чат нужно обязательно написать мини-анкету о себе, и скинуть нюдс или мем 18+. В нарушении этого правила участник будет исключен из чата.

⚠⚠⚠️ <b>Внимание!</b> Вы должны написать приветственную анкету (имя, пол, возраст, город, фото или мем 18+) в течение ${pluralizeMinutes(TIME_LIMIT_MINUTES)} после вступления, иначе будете забанены. ⚠⚠⚠

<b>Нажав кнопку ниже, вы подтверждаете, что ознакомились и согласны с правилами группы.</b>
`;

bot.start(async (ctx) => {
  if (ctx.chat.type !== "private") return;

  const user = ctx.from;

  if (await isUserInChat(bot, GROUP_ID, user.id)) {
    await ctx.reply("✅ Вы уже состоите в чате.");
    return;
  }

  const existing = userRequests.get(user.id);

  if (existing?.status === "pending") {
    await ctx.reply("⏳ Ваша заявка ещё на рассмотрении у администраторов.");
    return;
  }

  const prev = userRequests.get(user.id) || {};
  const requestCount = (prev.request_count || 0) + 1;

  userInviteLinks.delete(user.id);

  userRequests.set(user.id, {
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    agreed: false,
    approved: false,
    join_time: null,
    request_count: requestCount,
    extra_answer: null,
    status: "created",
  });

  await ctx.reply(rulesText, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      Markup.button.callback(
        "✅ Я согласен с правилами и напишу анкету при входе",
        `agree_rules`,
      ),
    ]),
  });
});

// === Кнопка "согласен с правилами" ===
bot.action("agree_rules", async (ctx) => {
  const user = ctx.from;
  const userId = ctx.from.id;

  if (await isUserBanned(ctx, GROUP_ID, userId)) {
    await ctx.editMessageText(
      "⛔️ Вам ранее был выдан бан в этом чате. Сначала свяжитесь с администраторами.",
    );
    await ctx.telegram.sendMessage(
      ADMIN_GROUP_ID,
      `⛔️ Пользователь 
      ├ ID: <code>${userId}</code>
      ├ <a href="tg://user?id=${userId}">${userId}</a>
      ├ Имя: ${user.first_name || "—"}
      ├ Фамилия: ${user.last_name || "—"}
      └ Username: @${user.username || "—"}
      пытается зайти, но он в бане.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  const data = userRequests.get(user.id) || {
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    request_count: 0,
  };
  data.agreed = true;
  userRequests.set(user.id, data);

  // Генерим новую инвайт-ссылку (однократную)
  const invite = await generateNewInviteLink(
    ctx,
    user.id,
    GROUP_ID,
    userInviteLinks,
  );

  await ctx.editMessageText(
    "✅ Вы согласились с правилами! Запрос отправлен администраторам. Ожидайте одобрения.",
  );

  // Отправляем запрос админам
  await sendRequestToAdmins(ctx, user.id, invite?.invite_link, userRequests);
});

bot.action(/^(approve|reject)_(\d+)$/, async (ctx) => {
  if (ctx.chat?.id !== ADMIN_GROUP_ID) {
    return;
  }

  const admin = ctx.from;
  if (!isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }

  const [, action, targetIdStr] = ctx.match;
  const targetId = Number(targetIdStr);
  const userInfo = userRequests.get(targetId);

  if (!userInfo) {
    return ctx.editMessageText("❌ Пользователь не найден или запрос устарел.");
  }

  if (userInfo.status && userInfo.status !== "pending") {
    return ctx.answerCbQuery(
      `Заявка уже ${userInfo.status === "approved" ? "одобрена" : "отклонена"}.`,
      { show_alert: true },
    );
  }

  if (action === "approve") {
    userInfo.approved = true;
    userInfo.status = "approved";
    userRequests.set(targetId, userInfo);

    const invite = await generateNewInviteLink(
      ctx,
      targetId,
      GROUP_ID,
      userInviteLinks,
    );
    if (!invite?.invite_link) {
      return ctx.editMessageText(
        `❌ Ошибка генерации ссылки для ${userInfo.first_name || targetId}`,
      );
    }

    await closeAdminRequest(
      ctx,
      targetId,
      userRequests,
      `✅ Запрос от ${userInfo.first_name || targetId} одобрен администратором ${admin.first_name}\n🔗 Новая ссылка отправлена пользователю`,
    );

    const successMsg = [
      "🎉 Ваш запрос одобрен!",
      "",
      "Добро пожаловать в нашу группу!",
      "",
      "Для вступления перейдите по ссылке:",
      invite.invite_link,
      "",
      "⚠️ <b>ВАЖНО:</b>",
      "• Ссылка действительна только для одного использования",
      `• После вступления напишите любое сообщение в группе в течение ${pluralizeMinutes(TIME_LIMIT_MINUTES)}!`,
      "• Иначе вы будете автоматически забанены",
      "",
      "🆘 Если ссылка не работает, запросите новую через /start",
    ].join("\n");

    try {
      await ctx.telegram.sendMessage(targetId, successMsg, {
        parse_mode: "HTML",
      });
    } catch (e: any) {
      console.error("Ошибка отправки инвайта пользователю:", e);

      await ctx.telegram.sendMessage(
        ADMIN_GROUP_ID,
        `❌ Ошибка отправки ссылки пользователю: ${e.message || e}`,
      );
    }
  } else {
    // reject
    userInviteLinks.delete(targetId);
    userInfo.approved = false;
    userInfo.status = "rejected";
    userRequests.set(targetId, userInfo);

    await closeAdminRequest(
      ctx,
      targetId,
      userRequests,
      `❌ Запрос от ${userInfo.first_name || targetId} отклонен администратором ${admin.first_name}`,
    );

    try {
      await ctx.telegram.sendMessage(
        targetId,
        "❌ Ваш запрос на вступление в группу был отклонен администратором.\n\nЕсли хотите попробовать снова, используйте /start",
      );
    } catch (e) {
      console.error("Ошибка отправки уведомления об отклонении:", e);

      await ctx.telegram.sendMessage(
        ADMIN_GROUP_ID,
        `❌ Ошибка отправки уведомления об отклонении`,
      );
    }
  }
});

// === Отслеживание новых участников в группе ===
bot.on(message("new_chat_members"), async (ctx) => {
  // Только в нужной группе
  if (!ctx.chat || ctx.chat.id !== GROUP_ID) return;

  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;

    const joinTime = new Date();
    userJoinTimes.set(member.id, joinTime);
    userFirstMessages.set(member.id, false);

    // пометим ссылку как использованную
    const linkInfo = userInviteLinks.get(member.id);
    if (linkInfo) {
      linkInfo.used = true;
      linkInfo.used_at = new Date();
      userInviteLinks.set(member.id, linkInfo);
    }

    // таймер на молчание
    clearSilenceTimer(member.id, silenceTimers);
    const handle = setTimeout(
      async () => {
        try {
          const wrote = userFirstMessages.get(member.id);
          if (!wrote) {
            await banUserForSilence(
              ctx,
              member,
              joinTime,
              GROUP_ID,
              userJoinTimes,
              userFirstMessages,
              userInviteLinks,
              silenceTimers,
            );
          }
        } catch (e) {
          console.error("Ошибка в таймере молчания:", e);

          await ctx.telegram.sendMessage(
            ADMIN_GROUP_ID,
            `❌ Ошибка отправки ссылки пользователю: ${e.message || e}`,
          );
        }
      },
      TIME_LIMIT_MINUTES * 60 * 1000,
    );
    silenceTimers.set(member.id, handle);

    const sent = await ctx.replyWithHTML(
      [
        `👋 Добро пожаловать, <a href="tg://user?id=${member.id}">${escapeHtml(member.first_name || "гость")}</a>!`,
        "",
        `⚠️ <b>Напоминание:</b> Напишите вашу анкету (имя, пол, возраст, город, фото или мем 18+) в течении ${pluralizeMinutes(TIME_LIMIT_MINUTES)}.`,
        "",
        "⏰ Время пошло!",
      ].join("\n"),
    );

    welcomeMsgs.set(member.id, {
      chatId: ctx.chat.id,
      messageId: sent.message_id,
    });
  }
});

bot.command("whois", async (ctx) => {
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
});

bot.command("chatid", async (ctx) => {
  if (isAdmin(ctx.from.id)) {
    console.log("chat id", ctx.chat.id);
  }
});

// === Отслеживание сообщений пользователей в группе ===
bot.on("message", async (ctx) => {
  if (!ctx.chat || ctx.chat.id !== GROUP_ID) return;
  const user = ctx.from;
  if (!user || user.is_bot || isAdmin(user.id)) return;

  if (
    userFirstMessages.has(user.id) &&
    userFirstMessages.get(user.id) === false
  ) {
    if (!messageHasPhoto(ctx.message)) {
      await ctx.replyWithHTML(
        [
          `⚠️ <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || "гость")}</a>,`,
          "первое сообщение должно содержать фото (или мем 18+) 📸.",
          `Отправьте фото, иначе вы будете забанены через ${pluralizeMinutes(TIME_LIMIT_MINUTES)} после вступления.`,
        ].join("\n"),
      );
      // Ничего не меняем: таймер не снимаем, статус не отмечаем
      return;
    }

    userFirstMessages.set(user.id, true);

    // снять таймер
    clearSilenceTimer(user.id, silenceTimers);

    // удалить приветственное сообщение, если есть
    const wm = welcomeMsgs.get(user.id);
    if (wm) {
      try {
        await ctx.telegram.deleteMessage(wm.chatId, wm.messageId);
      } catch (e) {
        // сообщение уже могли удалить/изменить — игнорируем
      } finally {
        welcomeMsgs.delete(user.id);
      }
    }

    await ctx.replyWithHTML(
      [
        `✅ Спасибо за ваше первое сообщение, <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || "гость")}</a>!`,
        "",
        "🎉 Добро пожаловать в сообщество!",
      ].join("\n"),
    );

    userJoinTimes.delete(user.id);
  }
});

// === Команда /reset в личке ===
bot.command("reset", async (ctx) => {
  const user = ctx.from;
  userRequests.delete(user.id);
  userInviteLinks.delete(user.id);
  clearSilenceTimer(user.id, silenceTimers);
  ctx.reply(
    "🔄 Ваши предыдущие запросы сброшены. Используйте /start для создания нового запроса с новой ссылкой.",
  );
});

try {
  bot.launch();
  console.log("✅ Бот запущен (Telegraf, polling).");

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
} catch (e) {
  console.log("Ошибка запуска", e);
}

// Корректное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
