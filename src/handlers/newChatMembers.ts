import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { appType } from "../const";
import {
  silenceTimers,
  userFirstMessages,
  userInviteLinks,
  userJoinTimes,
  welcomeMsgs,
} from "../core";
import type { NewMembersContext } from "../types/types";
import { AppTypes } from "../types/types";
import {
  ADMIN_GROUP_ID,
  escapeHtml,
  GROUP_ID,
  isAdmin,
  TIME_LIMIT_MINUTES,
} from "../utils";
import { banUserForSilence } from "../utils/banUserForSilence";
import { clearSilenceTimer } from "../utils/clearSilenceTimer";
import { pluralizeMinutesGenitive } from "../utils/pluralizeMinutes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioPath = path.resolve(__dirname, "../assets/welcome.ogg");

// eslint-disable-next-line sonarjs/cognitive-complexity
export const newChatMembers = async (ctx: NewMembersContext) => {
  const user = ctx.from;

  if (!user) return;
  if (!ctx.message) return;
  if (!ctx.chat || ctx.chat.id !== GROUP_ID) return;

  if (isAdmin(ctx.message.from.id)) {
    return;
  }

  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;

    const joinTime = new Date();
    userJoinTimes.set(member.id, joinTime);
    userFirstMessages.set(member.id, false);

    // пометим ссылку как использованную
    const linkInfo = userInviteLinks.get(member.id);
    if (linkInfo && !linkInfo.used) {
      try {
        // 1️⃣ Отзываем ссылку в Telegram
        await ctx.telegram.revokeChatInviteLink(GROUP_ID, linkInfo.link);
      } catch (e) {
        console.error("Не удалось отозвать инвайт:", e);
      }

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

          const err = e as Error;
          await ctx.telegram.sendMessage(
            ADMIN_GROUP_ID,
            `❌ Ошибка отправки ссылки пользователю: ${err.message || e}`,
          );
        }
      },
      TIME_LIMIT_MINUTES * 60 * 1000,
    );
    silenceTimers.set(member.id, handle);

    const mem = appType === AppTypes.gryzuka ? "мем 18+" : "алко-мем";

    const sent = await ctx.replyWithHTML(
      [
        `👋 Добро пожаловать, <a href="tg://user?id=${member.id}">${escapeHtml(member.first_name || "гость")}</a>!`,
        "",
        `⚠️ <b>Напоминание:</b> Напишите вашу анкету (имя, пол, возраст, город, фото или ${mem}) в течение ${pluralizeMinutesGenitive(TIME_LIMIT_MINUTES)}.`,
        "",
        "⏰ Время пошло!",
      ].join("\n"),
    );

    if (appType === AppTypes.gryzuka) {
      await ctx.replyWithAudio({ source: fs.createReadStream(audioPath) });
    }

    welcomeMsgs.set(member.id, {
      chatId: ctx.chat.id,
      messageId: sent.message_id,
    });
  }
};
