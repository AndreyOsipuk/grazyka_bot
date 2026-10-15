import type { Context } from "telegraf";

import { ADMIN_GROUP_ID, escapeHtml, GROUP_ID, isAdmin } from "./index";
import { buildChatMessageLink } from "./memeModeration";

// Разрешённые админские команды
const MODERATION_COMMAND_RE = /^!(warn|mute|unmute|ban|unban|kick|restrict)\b/i;

type ModerationLog = {
  adminMention: string;
  command: string;
  targetMention: string;
  // ссылка на сообщение, к которому относится команда (может быть пустой)
  link: string;
};

export function buildModerationLogText(p: ModerationLog): string {
  return [
    `🛡 <b>Админское действие</b>`,
    `👮 Админ: ${p.adminMention}`,
    `💬 Команда: <code>${escapeHtml(p.command)}</code>`,
    `🎯 Цель: ${p.targetMention}`,
    ...(p.link ? [`🔗 <a href="${p.link}">Перейти к сообщению</a>`] : []),
  ].join("\n");
}

type MentionUser = { id: number; username?: string; first_name?: string };

function mentionOf(u: MentionUser): string {
  return u.username
    ? `@${u.username}`
    : `<a href="tg://user?id=${u.id}">${escapeHtml(u.first_name || "user")}</a>`;
}

// Цель команды: автор сообщения, на которое ответили (лучший вариант), иначе
// @username из текста команды (!warn @androsible).
function resolveTarget(replyFrom: MentionUser | undefined, text: string) {
  if (replyFrom) return mentionOf(replyFrom);
  const m = text.match(/@(\w+)/);
  return m ? `@${m[1]}` : "— неизвестно —";
}

export const logCombotModeration = async (ctx: Context) => {
  const chat = ctx.chat;
  const from = ctx.from;

  if (!chat || chat.id !== GROUP_ID) return;
  if (!from) return;

  // Нужны только админы
  if (!isAdmin(from.id)) return;

  // Нет отдельного админ-чата (как у алкобота: ADMIN_GROUP_ID = сам чат) —
  // лог ушёл бы в общий чат, поэтому не шлём.
  if (ADMIN_GROUP_ID === GROUP_ID) return;

  const msg = ctx.message;
  if (!msg) return;

  const text =
    ("text" in msg && msg.text) || ("caption" in msg && msg.caption) || "";
  const trimmed = text.trim();

  // Проверяем, что это модераторская команда
  const cmdMatch = trimmed.match(MODERATION_COMMAND_RE);
  if (!cmdMatch) return;

  const command = cmdMatch[0]; // например "!warn"

  const reply = "reply_to_message" in msg ? msg.reply_to_message : undefined;
  const targetMention = resolveTarget(reply?.from, trimmed);
  const adminMention = mentionOf(from);

  // Ссылка на сообщение нарушителя, если команда была ответом, иначе на саму
  // команду — чтобы из админки можно было перейти к контексту.
  const link = buildChatMessageLink(
    chat.id,
    reply?.message_id ?? msg.message_id,
  );

  try {
    await ctx.telegram.sendMessage(
      ADMIN_GROUP_ID,
      buildModerationLogText({ adminMention, command, targetMention, link }),
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    );
  } catch (e) {
    console.error("Не удалось отправить лог админского действия:", e);
  }
};
