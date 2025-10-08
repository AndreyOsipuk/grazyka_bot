import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import pkg from 'telegraf/filters';

const { message, chatType } = pkg;

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required in .env');


const ADMIN_GROUP_ID = Number(process.env.ADMIN_GROUP_ID);
if (!ADMIN_GROUP_ID) throw new Error('ADMIN_GROUP_ID is required in .env');

const GROUP_ID = Number(process.env.GROUP_ID);
if (!GROUP_ID) throw new Error('GROUP_ID is required in .env');

const TIME_LIMIT_MINUTES = Number(process.env.TIME_LIMIT_MINUTES || 10);

const ADMIN_IDS = process.env.ADMIN_IDS?.split(/[\s,]+/).map(v => Number(v)) || []

console.log("Админы:", ADMIN_IDS.toString())

// === Хранилище в памяти ===
/** userId -> { username, first_name, last_name, agreed, approved, join_time, request_count } */
const userRequests = new Map();
/** userId -> Date */
const userJoinTimes = new Map();
/** userId -> boolean (написал первое сообщение?) */
const userFirstMessages = new Map();
/** userId -> { link, created_at: Date, used: boolean, used_at?: Date } */
const userInviteLinks = new Map();
/** userId -> NodeJS.Timeout (таймер на бан за молчание) */
const silenceTimers = new Map();
const answerGate = new Map();

console.log('🔑 BOT_TOKEN найден, создаём экземпляр бота...');
const bot = new Telegraf(BOT_TOKEN);

// === Утилиты ===
const isAdmin = (userId) => ADMIN_IDS.includes(Number(userId));

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

⚠⚠⚠️ <b>Внимание!</b> Вы должны написать приветственную анкету (имя, пол, возраст, город, фото или мем 18+) в течение ${TIME_LIMIT_MINUTES} минуты после вступления, иначе будете забанены. ⚠⚠⚠

<b>Нажав кнопку ниже, вы подтверждаете, что ознакомились и согласны с правилами группы.</b>
`;

bot.start(async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const user = ctx.from;

    answerGate.set(user.id, { waiting: true });

    userRequests.delete(user.id);
    userInviteLinks.delete(user.id);

    await ctx.reply(
        `Перед вступлением вставьте пропущенные слова из цитаты:\n\nУблюдок, мать твою, а ну, иди сюда, **** ******, а? Сдуру решил ко мне лезть, ты? Засранец вонючий, мать твою...`,
        { parse_mode: 'HTML' }
    );
});

bot.on(message('text'), async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next();

    const user = ctx.from;

    const isCorrect = String(ctx.message.text).trim().toLowerCase() === "говно собачье";

    if (!isCorrect) {
        await ctx.reply('❌ Ответ неверный. Попробуйте ещё раз.');
        return;
    }

    answerGate.delete(user.id);

    const prev = userRequests.get(user.id) || {};
    const requestCount = (prev.request_count || 0) + 1;

    userRequests.set(user.id, {
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        agreed: false,
        approved: false,
        join_time: null,
        request_count: requestCount,
        extra_answer: null,
        status: 'pending',
    });

    await ctx.reply(
        '✅ Верно! Ниже — правила и кнопка подтверждения.',
    );

    await ctx.reply(rulesText, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            Markup.button.callback('✅ Я согласен с правилами и напишу анкету при входе', `agree_rules`),
        ]),
    });
});

// === Кнопка "согласен с правилами" ===
bot.action('agree_rules', async (ctx) => {
    const user = ctx.from;

    const data = userRequests.get(user.id) || {
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        request_count: 0,
    };
    data.agreed = true;
    data.request_count = (data.request_count || 0) + 1;
    userRequests.set(user.id, data);

    // Генерим новую инвайт-ссылку (однократную)
    const invite = await generateNewInviteLink(ctx, user.id);

    await ctx.editMessageText('✅ Вы согласились с правилами! Запрос отправлен администраторам. Ожидайте одобрения.');

    // Отправляем запрос админам
    await sendRequestToAdmins(ctx, user.id, invite?.invite_link);
});

// === Генерация инвайт-ссылки ===
async function generateNewInviteLink(ctx, userId) {
    try {
        const name = `invite_${userId}_${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`;
        const invite = await ctx.telegram.createChatInviteLink(GROUP_ID, {
            member_limit: 1,
            creates_join_request: false,
            name,
        });

        userInviteLinks.set(userId, {
            link: invite.invite_link,
            created_at: new Date(),
            used: false,
        });

        return invite;
    } catch (e) {
        console.error('Ошибка генерации ссылки:', e);
        return null;
    }
}

// === Сообщение админам ===
async function sendRequestToAdmins(ctx, userId, inviteLink) {
    const u = userRequests.get(userId);
    if (!u) return;

    let text = [
        '🔔 <b>Новый запрос на вступление в группу</b>',
        '',
        '<b>Информация о пользователе:</b>',
        `├ ID: <code>${userId}</code>`,
        `├ Имя: ${u.first_name || '—'}`,
        `├ Фамилия: ${u.last_name || '—'}`,
        `└ Username: @${u.username || '—'}`,
        `├ Запросов: ${u.request_count || 1}`,
        '',
        `⚠️ Пользователь согласился с правилами, включая требование первого сообщения в течение ${TIME_LIMIT_MINUTES} минут.`,
    ].join('\n');

    if (inviteLink) {
        text += `\n\n🔗 <b>Новая ссылка сгенерирована</b>`;
    }

    const kb = Markup.inlineKeyboard([
        Markup.button.callback('✅ Одобрить', `approve_${userId}`),
        Markup.button.callback('❌ Отклонить', `reject_${userId}`),
    ]);

    try {
        const sent = await ctx.telegram.sendMessage(ADMIN_GROUP_ID, text, { parse_mode: 'HTML', ...kb });

        const prev = userRequests.get(userId) || {};
        userRequests.set(userId, {
            ...prev,
            adminMsg: { chatId: sent.chat.id, messageId: sent.message_id },
            status: 'pending'
        });
    } catch (e) {
        console.error(`Ошибка отправки в ADMIN_GROUP_ID=${ADMIN_GROUP_ID}:`, e);
    }
}

// === Обработка approve/reject ===
bot.action(/^(approve|reject)_(\d+)$/, async (ctx) => {
    if (ctx.chat?.id !== ADMIN_GROUP_ID) {
        return;
    }

    const admin = ctx.from;
    if (!isAdmin(admin.id)) {
        return ctx.answerCbQuery('❌ У вас нет прав для этого действия!', { show_alert: true });
    }

    const [, action, targetIdStr] = ctx.match;
    const targetId = Number(targetIdStr);
    const userInfo = userRequests.get(targetId);
    if (!userInfo) {
        await removeAdminKeyboard(ctx, targetId);
        return ctx.editMessageText('❌ Пользователь не найден или запрос устарел.');
    }

    if (userInfo.status && userInfo.status !== 'pending') {
        await removeAdminKeyboard(ctx, targetId);
        return ctx.answerCbQuery(
            `Заявка уже ${userInfo.status === 'approved' ? 'одобрена' : 'отклонена'}.`,
            { show_alert: true }
        );
    }

    await removeAdminKeyboard(ctx, targetId);
    
    if (action === 'approve') {
        userInfo.approved = true;
        userInfo.status = 'approved';
        userRequests.set(targetId, userInfo);

        const invite = await generateNewInviteLink(ctx, targetId);
        if (!invite?.invite_link) {
            return ctx.editMessageText(`❌ Ошибка генерации ссылки для ${userInfo.first_name || targetId}`);
        }

        await ctx.editMessageText(
            `✅ Запрос от ${userInfo.first_name || targetId} одобрен администратором ${admin.first_name}\n🔗 Новая ссылка отправлена пользователю`
        );

        const successMsg = [
            '🎉 Ваш запрос одобрен!',
            '',
            'Добро пожаловать в нашу группу!',
            '',
            'Для вступления перейдите по ссылке:',
            invite.invite_link,
            '',
            '⚠️ <b>ВАЖНО:</b>',
            '• Ссылка действительна только для одного использования',
            `• После вступления напишите любое сообщение в группе в течение ${TIME_LIMIT_MINUTES} минут!`,
            '• Иначе вы будете автоматически забанены',
            '',
            '🆘 Если ссылка не работает, запросите новую через /start',
        ].join('\n');

        try {
            await ctx.telegram.sendMessage(targetId, successMsg, { parse_mode: 'HTML' });
        } catch (e) {
            console.error('Ошибка отправки инвайта пользователю:', e);
            await ctx.telegram.sendMessage(admin.id, `❌ Ошибка отправки ссылки пользователю: ${e.message || e}`);
        }
    } else {
        // reject
        userInviteLinks.delete(targetId);
        userInfo.approved = false;
        userInfo.status = 'rejected';
        userRequests.set(targetId, userInfo);

        await ctx.editMessageText(
            `❌ Запрос от ${userInfo.first_name || targetId} отклонен администратором ${admin.first_name}`
        );

        try {
            await ctx.telegram.sendMessage(
                targetId,
                '❌ Ваш запрос на вступление в группу был отклонен администратором.\n\nЕсли хотите попробовать снова, используйте /start'
            );
        } catch (e) {
            console.error('Ошибка отправки уведомления об отклонении:', e);
        }
    }
});

// === Отслеживание новых участников в группе ===
bot.on(message('new_chat_members'), async (ctx) => {
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
        clearSilenceTimer(member.id);
        const handle = setTimeout(async () => {
            try {
                const wrote = userFirstMessages.get(member.id);
                if (!wrote) {
                    await banUserForSilence(ctx, member, joinTime);
                }
            } catch (e) {
                console.error('Ошибка в таймере молчания:', e);
            }
        }, TIME_LIMIT_MINUTES * 60 * 1000);
        silenceTimers.set(member.id, handle);

        await ctx.replyWithHTML(
            [
                `👋 Добро пожаловать, <a href="tg://user?id=${member.id}">${escapeHtml(member.first_name || 'гость')}</a>!`,
                '',
                `⚠️ <b>Напоминание:</b> Напишите ваше первое сообщение в течение ${TIME_LIMIT_MINUTES} минут.`,
                '',
                '⏰ Время пошло!',
            ].join('\n')
        );
    }
});

bot.command('whois', async (ctx) => {
    if (!isAdmin(ctx.message.from.id)) {
        return
    }

    const reply = ctx.message?.reply_to_message;
    const arg = (ctx.message?.text || '').split(/\s+/)[1]?.trim();
    let user = null;

    if (reply?.from) {
        user = reply.from;
    }

    if (!user && reply?.forward_from) {
        user = reply.forward_from;
    }

    if (!user && arg && /^\d+$/.test(arg)) {
        try {
            const member = await ctx.telegram.getChatMember(ctx.chat.id, Number(arg));
            user = member?.user || null;
        } catch (e) {
            // не нашли участника или бот не видит юзера в этом чате
        }
    }

    if (!user) {
        return ctx.reply(
            [
                'Использование:',
                '• Ответьте /whois на сообщение пользователя',
                '• или /whois <user_id> (числом)',
                '',
                'Подсказка: @username нельзя резолвить через Bot API для приватных пользователей.',
            ].join('\n')
        );
    }

    await ctx.reply(
        [
            `ID: <code>${user.id}</code>`,
            `Имя: ${user.first_name || '—'} ${user.last_name || ''}`.trim(),
            `Username: @${user.username || '—'}`,
            `Is bot: ${user.is_bot ? 'yes' : 'no'}`
        ].join('\n'),
        { parse_mode: 'HTML' }
    );
})

bot.command('chatid', async (ctx) => {
    if (isAdmin(ctx.from.id)) {
        console.log('chat id', ctx.chat.id);
    }
})

// === Отслеживание сообщений пользователей в группе ===
bot.on('message', async (ctx) => {
    if (!ctx.chat || ctx.chat.id !== GROUP_ID) return;
    const user = ctx.from;
    if (!user || user.is_bot || isAdmin(user.id)) return;

    if (userFirstMessages.has(user.id) && userFirstMessages.get(user.id) === false) {
        userFirstMessages.set(user.id, true);
        const joinTime = userJoinTimes.get(user.id) || new Date();
        const diffMin = Math.max(0, (Date.now() - joinTime.getTime()) / 60000);

        // снять таймер
        clearSilenceTimer(user.id);

        await ctx.replyWithHTML(
            [
                `✅ Спасибо за ваше первое сообщение, <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || 'гость')}</a>!`,
                '',
                `⏱ Вы написали сообщение через ${diffMin.toFixed(1)} минут после вступления.`,
                '🎉 Добро пожаловать в сообщество!',
            ].join('\n')
        );

        userJoinTimes.delete(user.id);
    }
});

// === Команда /reset в личке ===
bot.command('reset', async (ctx) => {
    const user = ctx.from;
    userRequests.delete(user.id);
    userInviteLinks.delete(user.id);
    clearSilenceTimer(user.id);
    ctx.reply('🔄 Ваши предыдущие запросы сброшены. Используйте /start для создания нового запроса с новой ссылкой.');
});

// === Вспомогательные функции ===
function clearSilenceTimer(userId) {
    const t = silenceTimers.get(userId);
    if (t) {
        clearTimeout(t);
        silenceTimers.delete(userId);
    }
}

async function removeAdminKeyboard(ctx, userId) {
  const rec = userRequests.get(userId);
  const msg = rec?.adminMsg;
  if (!msg) return;

  try {
    // Вариант 1: полностью удалить клавиатуру
    await ctx.telegram.editMessageReplyMarkup(msg.chatId, msg.messageId, undefined, undefined);

    // Вариант 2 (на случай капризов API): установить пустую клавиатуру
    // await ctx.telegram.editMessageReplyMarkup(msg.chatId, msg.messageId, undefined, { inline_keyboard: [] });
  } catch (e) {
    // Если сообщение уже отредактировано/удалено – здесь будет ошибка, игнорируем
    // console.warn('removeAdminKeyboard error:', e?.description || e);
  }
}

async function banUserForSilence(ctx, user, joinTime) {
    try {
        const until = Math.floor((Date.now() + 24 * 3600 * 1000) / 1000); // +1 день
        await ctx.telegram.banChatMember(GROUP_ID, user.id, { until_date: until });

        await ctx.telegram.sendMessage(
            GROUP_ID,
            [
                `🚫 Пользователь <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || user.id)}</a> был забанен за нарушение правил.`,
                '',
                `❌ <b>Причина:</b> Не написал первое сообщение в течение ${TIME_LIMIT_MINUTES} минут после вступления.`,
                `⏰ <b>Время вступления:</b> ${joinTime.toLocaleTimeString('ru-RU')}`,
            ].join('\n'),
            { parse_mode: 'HTML' }
        );


        try {
            await ctx.telegram.sendMessage(
                ADMIN_GROUP_ID,
                `🚫 Автоматический бан: ${user.first_name || user.id} (ID: ${user.id}) за молчание`
            );
        } catch (e) {
            console.error(`Ошибка отправки в ADMIN_GROUP_ID=${ADMIN_GROUP_ID}:`, e);
        }


        userJoinTimes.delete(user.id);
        userFirstMessages.delete(user.id);
        userInviteLinks.delete(user.id);
        clearSilenceTimer(user.id);
    } catch (e) {
        console.error('Ошибка бана пользователя:', e);
    }
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


try {
    bot.launch();
    console.log('✅ Бот запущен (Telegraf, polling).');

    await bot.telegram.setMyCommands(
        [{ command: 'start', description: 'Начать' }],
        { scope: { type: 'all_private_chats' } }
    );

    await bot.telegram.setMyCommands(
        [
            { command: 'start', description: 'Начать' },
            { command: 'whois', description: 'Инфо о пользователе (reply или /whois <id>)' },
            { command: 'chatid', description: 'Показать ID чата' },
        ],
        { scope: { type: 'chat', chat_id: ADMIN_GROUP_ID } }
    );
} catch (e) {
    console.log('Ошибка запуска', e);
}



// Корректное завершение
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
