import logging
import asyncio
from datetime import datetime, timedelta
from telegram import (
    Update, 
    InlineKeyboardButton, 
    InlineKeyboardMarkup
)
from telegram.ext import (
    Application, 
    CommandHandler, 
    CallbackQueryHandler, 
    ContextTypes,
    MessageHandler,
    filters
)

# Настройки
BOT_TOKEN = "8481936082:AAGYI8H78qoR5XxmTRL2oMUGJBKB1g09New"
ADMIN_IDS = [455905275]  # ID администраторов
GROUP_ID = -1003135171437  # ID вашей группы
TIME_LIMIT_MINUTES = 1  # Лимит времени для первого сообщения

# Хранилище данных
user_requests = {}
user_join_times = {}
user_first_messages = {}
user_invite_links = {}  # Храним активные ссылки пользователей

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    user = update.effective_user
    
    # Сбрасываем предыдущий запрос пользователя и генерируем новую ссылку
    user_requests[user.id] = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'agreed': False,
        'approved': False,
        'join_time': None,
        'request_count': user_requests.get(user.id, {}).get('request_count', 0) + 1
    }
    
    # Удаляем старую ссылку если была
    if user.id in user_invite_links:
        del user_invite_links[user.id]
    
    # Создаем клавиатуру с кнопкой
    keyboard = [
        [InlineKeyboardButton("✅ Я согласен с правилами", callback_data="agree_rules")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
# Текст с правилами
    rules_text = """
ссылка на правила: https://t.me/c/2911005935/9954

Основные положения.

1. Чат создан для обсуждения всех видов юмора 18+, дружеского общения, а так же любительской и домашней эротики. 
2. Чат строго 18+. При добавлении в чат участник должен кратко рассказать о себе, в том числе отправить мем 18+, или свое фото. 
Зайти и "Просто посмотреть" не выйдет :)
3.  Все участники чата должны быть готовы участвовать в жизни сообщества и общении. При отсутствии активности в течение 15 дней идёт автоматический бан.
4.  Заявки на добавление в чат принимаются от всех желающих, но итоговое решение о добавлении принимается администрацией чата.
5.  Добавление в чат производится по ссылке после прочтения правил и нажатия на кнопку.

Правила общения в чате.

1. Общение в чате производится текстовыми сообщениями, аудио и видео сообщениями. Злоупотребление  видеосообщениями, аудио сообщениями (больше 5 штук подряд), стикерами караются мьютом. При повторении инцидента следует бан. 
2. Общение происходит в уважительной форме, соблюдая правила этики и лексики.  
3. Фотографии и контент 18+ для всеобщего комфорта следует прятать за шторку/спойлер. 
4. Горячая тема для обсуждения фиксируется администраторами в закрепе. 

Запреты и баны.

1. В чате запрещено неуважительное отношение к собеседникам или выражение любого рода расовой, половой и прочей дискриминации. 
2. Запрещено писать в личные сообщения участникам без получения разрешения от них в чате: при однократных жалобах идёт предупреждение, при повторении инцидента - бан.
3. В чате используются настройки запрещающие пересылку и копирование информации через мессенджер.
Но! Запрещено любого рода копирование и передача информации из переписки в чате в сторонние ресурсы и любое использование переписки на стороне по средствам фиксации на второй телефон, скриншоты с компьютера и тд. 
4. Использование мемов, картинок, видеороликов, фото, связанных с детской эротикой/порнографией запрещено и карается перманентным баном.
5. Администраторы имеют право отправить участника в бан или мьют на неопределенный срок за несоблюдение регламента, а также по своему усмотрению.
Незнание правил не освобождает от ответственности :)

При вхождении в чат нужно обязательно написать мини-анкету о себе, и скинуть нюдс или мем 18+. В нарушении этого правила участник будет исключен из чата.


⚠⚠⚠️ **Внимание!** Вы должны написать первое сообщение в течение 10 минут после вступления, иначе будете забанены. ⚠⚠⚠


**Нажав кнопку ниже, вы подтверждаете, что ознакомились и согласны с правилами группы.**
"""
    
    await update.message.reply_text(
        rules_text,
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def generate_new_invite_link(context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Генерация новой уникальной ссылки-приглашения"""
    try:
        # Создаем новую ссылку с ограничением в 1 использование
        invite_link = await context.bot.create_chat_invite_link(
            chat_id=GROUP_ID,
            member_limit=1,
            creates_join_request=False,
            name=f"invite_{user_id}_{datetime.now().strftime('%H%M%S')}"  # Уникальное имя
        )
        
        # Сохраняем ссылку для пользователя
        user_invite_links[user_id] = {
            'link': invite_link.invite_link,
            'created_at': datetime.now(),
            'used': False
        }
        
        logging.info(f"Сгенерирована новая ссылка для пользователя {user_id}")
        return invite_link.invite_link
        
    except Exception as e:
        logging.error(f"Ошибка генерации ссылки для {user_id}: {e}")
        return None

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик нажатий на кнопки"""
    query = update.callback_query
    user = query.from_user
    
    await query.answer()
    
    if query.data == "agree_rules":
        # Пользователь согласился с правилами
        if user.id not in user_requests:
            user_requests[user.id] = {
                'username': user.username,
                'first_name': user.first_name, 
                'last_name': user.last_name,
                'agreed': True,
                'approved': False,
                'request_count': 1
            }
        else:
            user_requests[user.id]['agreed'] = True
            user_requests[user.id]['request_count'] = user_requests[user.id].get('request_count', 0) + 1
        
        # Генерируем новую ссылку для этого запроса
        new_invite_link = await generate_new_invite_link(context, user.id)
        
        # Обновляем сообщение
        await query.edit_message_text(
            "✅ Вы согласились с правилами! Запрос отправлен администраторам. Ожидайте одобрения.",
            reply_markup=None
        )
        
        # Отправляем запрос администраторам с новой ссылкой
        await send_request_to_admins(user.id, context, new_invite_link)
    
    elif query.data.startswith("approve_"):
        target_user_id = int(query.data.split("_")[1])
        await handle_approval(target_user_id, query, context, True)
    
    elif query.data.startswith("reject_"):
        target_user_id = int(query.data.split("_")[1])
        await handle_approval(target_user_id, query, context, False)

async def send_request_to_admins(user_id: int, context: ContextTypes.DEFAULT_TYPE, invite_link: str = None):
    """Отправка запроса администраторам"""
    if user_id not in user_requests:
        return
    
    user_info = user_requests[user_id]
    
    request_text = f"""
🔔 **Новый запрос на вступление в группу**

👤 **Информация о пользователе:**
├ ID: `{user_id}`
├ Имя: {user_info['first_name']}
├ Фамилия: {user_info['last_name'] or 'Не указана'}
└ Username: @{user_info['username'] or 'Не указан'}
├ Запросов: {user_info.get('request_count', 1)}

⚠️ **Пользователь согласился с правилами, включая требование первого сообщения в течение {TIME_LIMIT_MINUTES} минут.**
"""
    
    # Если есть новая ссылка, добавляем ее в сообщение админам
    if invite_link:
        request_text += f"\n🔗 **Новая ссылка сгенерирована**"
    
    keyboard = [
        [
            InlineKeyboardButton("✅ Одобрить", callback_data=f"approve_{user_id}"),
            InlineKeyboardButton("❌ Отклонить", callback_data=f"reject_{user_id}")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    for admin_id in ADMIN_IDS:
        try:
            await context.bot.send_message(
                chat_id=admin_id,
                text=request_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
        except Exception as e:
            logging.error(f"Ошибка отправки админу {admin_id}: {e}")

async def handle_approval(target_user_id: int, query, context: ContextTypes.DEFAULT_TYPE, approved: bool):
    """Обработка решения администратора"""
    admin = query.from_user
    
    if admin.id not in ADMIN_IDS:
        await query.answer("❌ У вас нет прав для этого действия!", show_alert=True)
        return
    
    if target_user_id not in user_requests:
        await query.edit_message_text("❌ Пользователь не найден или запрос устарел.")
        return
    
    user_info = user_requests[target_user_id]
    
    if approved:
        user_info['approved'] = True
        
        # Генерируем НОВУЮ ссылку для этого одобрения
        new_invite_link = await generate_new_invite_link(context, target_user_id)
        
        if new_invite_link:
            await query.edit_message_text(
                f"✅ Запрос от {user_info['first_name']} одобрен администратором {admin.first_name}\n"
                f"🔗 Новая ссылка отправлена пользователю"
            )
            
            try:
                success_message = f"""
🎉 Ваш запрос одобрен!

Добро пожаловать в нашу группу! 

Для вступления перейдите по ссылке:
{new_invite_link}

⚠️ **ВАЖНО:** 
• Ссылка действительна только для одного использования
• После вступления напишите любое сообщение в группе в течение {TIME_LIMIT_MINUTES} минут!
• Иначе вы будете автоматически забанены

🆘 Если ссылка не работает, запросите новую через /start
"""
                await context.bot.send_message(
                    chat_id=target_user_id,
                    text=success_message
                )
                logging.info(f"Новая ссылка отправлена пользователю {target_user_id}")
                
            except Exception as e:
                logging.error(f"Ошибка отправки приглашения пользователю {target_user_id}: {e}")
                # Сообщаем админу об ошибке
                await context.bot.send_message(
                    chat_id=admin.id,
                    text=f"❌ Ошибка отправки ссылки пользователю: {e}"
                )
        else:
            await query.edit_message_text(
                f"❌ Ошибка генерации ссылки для {user_info['first_name']}"
            )
    
    else:
        # При отклонении запроса очищаем данные
        if target_user_id in user_invite_links:
            del user_invite_links[target_user_id]
        
        user_info['approved'] = False
        
        await query.edit_message_text(
            f"❌ Запрос от {user_info['first_name']} отклонен администратором {admin.first_name}"
        )
        
        try:
            await context.bot.send_message(
                chat_id=target_user_id,
                text="❌ Ваш запрос на вступление в группу был отклонен администратором.\n\n"
                     "Если хотите попробовать снова, используйте /start"
            )
        except Exception as e:
            logging.error(f"Ошибка отправки уведомления об отклонении: {e}")

async def track_new_chat_members(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Отслеживание новых участников группы"""
    if update.message and update.message.new_chat_members:
        for user in update.message.new_chat_members:
            if user.is_bot:
                continue
                
            join_time = datetime.now()
            user_join_times[user.id] = join_time
            user_first_messages[user.id] = False
            
            # Помечаем ссылку как использованную
            if user.id in user_invite_links:
                user_invite_links[user.id]['used'] = True
                user_invite_links[user.id]['used_at'] = datetime.now()
            
            # Запускаем таймер для проверки первого сообщения
            asyncio.create_task(
                check_first_message(user.id, user, context, join_time)
            )
            
            welcome_text = f"""
👋 Добро пожаловать, {user.mention_html()}!

⚠️ **Напоминание:** Напишите ваше первое сообщение в течение {TIME_LIMIT_MINUTES} минут.

⏰ Время пошло!
"""
            await update.message.reply_text(
                welcome_text,
                parse_mode='HTML'
            )
            
            logging.info(f"Новый пользователь {user.id} добавлен в отслеживание")

async def check_first_message(user_id: int, user, context: ContextTypes.DEFAULT_TYPE, join_time: datetime):
    """Проверка первого сообщения пользователя"""
    try:
        await asyncio.sleep(TIME_LIMIT_MINUTES * 60)
        
        if user_id in user_first_messages and not user_first_messages[user_id]:
            await ban_user_for_silence(user_id, user, context, join_time)
            
    except Exception as e:
        logging.error(f"Ошибка в check_first_message для {user_id}: {e}")

async def ban_user_for_silence(user_id: int, user, context: ContextTypes.DEFAULT_TYPE, join_time: datetime):
    """Бан пользователя за молчание"""
    try:
        await context.bot.ban_chat_member(
            chat_id=GROUP_ID,
            user_id=user_id,
            until_date=int((datetime.now() + timedelta(days=1)).timestamp())
        )
        
        ban_message = f"""
🚫 Пользователь {user.mention_html()} был забанен за нарушение правил.

❌ **Причина:** Не написал первое сообщение в течение {TIME_LIMIT_MINUTES} минут после вступления.
⏰ **Время вступления:** {join_time.strftime('%H:%M:%S')}
"""
        await context.bot.send_message(
            chat_id=GROUP_ID,
            text=ban_message,
            parse_mode='HTML'
        )
        
        for admin_id in ADMIN_IDS:
            try:
                await context.bot.send_message(
                    chat_id=admin_id,
                    text=f"🚫 Автоматический бан: {user.first_name} (ID: {user_id}) за молчание"
                )
            except Exception as e:
                logging.error(f"Ошибка отправки админу {admin_id}: {e}")
        
        # Очищаем данные
        if user_id in user_join_times:
            del user_join_times[user_id]
        if user_id in user_first_messages:
            del user_first_messages[user_id]
        if user_id in user_invite_links:
            del user_invite_links[user_id]
            
        logging.info(f"Пользователь {user_id} забанен за молчание")
        
    except Exception as e:
        logging.error(f"Ошибка бана пользователя {user_id}: {e}")

async def track_user_messages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Отслеживание сообщений пользователей в группе"""
    if not update.message or update.message.chat.id != GROUP_ID:
        return
    
    user = update.effective_user
    
    if user.is_bot or user.id in ADMIN_IDS:
        return
    
    if user.id in user_first_messages and not user_first_messages[user.id]:
        user_first_messages[user.id] = True
        join_time = user_join_times.get(user.id, datetime.now())
        time_taken = (datetime.now() - join_time).total_seconds() / 60
        
        confirmation_text = f"""
✅ Спасибо за ваше первое сообщение, {user.mention_html()}!

⏱ Вы написали сообщение через {time_taken:.1f} минут после вступления.
🎉 Добро пожаловать в сообщество!
"""
        await update.message.reply_text(
            confirmation_text,
            parse_mode='HTML'
        )
        
        if user.id in user_join_times:
            del user_join_times[user.id]
        
        logging.info(f"Пользователь {user.id} написал первое сообщение через {time_taken:.1f} минут")

async def reset_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда для сброса своего запроса и получения новой ссылки"""
    user = update.effective_user
    
    # Полностью сбрасываем данные пользователя
    if user.id in user_requests:
        del user_requests[user.id]
    if user.id in user_invite_links:
        del user_invite_links[user.id]
    
    await update.message.reply_text(
        "🔄 Ваши предыдущие запросы сброшены. Используйте /start для создания нового запроса с новой ссылкой."
    )

def main():
    """Основная функция"""
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Обработчики
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("reset", reset_command))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    # Обработчики сообщений в группе
    application.add_handler(MessageHandler(
        filters.StatusUpdate.NEW_CHAT_MEMBERS, 
        track_new_chat_members
    ))
    application.add_handler(MessageHandler(
        filters.TEXT & filters.ChatType.GROUPS, 
        track_user_messages
    ))
    
    logging.info("Бот запущен с системой генерации новых ссылок...")
    application.run_polling()

if __name__ == "__main__":
    main()
