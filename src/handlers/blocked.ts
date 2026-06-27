import type { InlineKeyboardButton } from "telegraf/types";

import type { ActionContext, MessageContext } from "../types/types";
import { escapeHtml, isAdmin } from "../utils";
import { type BlockedListItem, listBlocked } from "../utils/blocked";
import { formatUserTag } from "../utils/formatUserTag";

const PAGE_SIZE = 20;

type CbButton = InlineKeyboardButton.CallbackButton;

function renderItem(b: BlockedListItem): { line: string; button: CbButton } {
  const tag = formatUserTag(b.id, b);
  const when = b.blocked_at
    ? new Date(b.blocked_at).toLocaleDateString("ru-RU")
    : "—";
  const by = b.blocked_by ? escapeHtml(b.blocked_by) : "—";

  return {
    line: `• ${tag} — <code>${b.id}</code>, ${when}, кем: ${by}`,
    button: {
      text: `Разблокировать ${b.username ? "@" + b.username : b.id}`,
      callback_data: `unblock_${b.id}`,
    },
  };
}

async function buildView(page: number) {
  const safePage = Math.max(0, page);
  const offset = safePage * PAGE_SIZE;
  const { data, total } = await listBlocked(PAGE_SIZE, offset);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (total === 0) {
    return {
      text: "✅ Заблокированных пользователей нет.",
      keyboard: [] as CbButton[][],
    };
  }

  const rendered = data.map(renderItem);
  const text = [
    `🚫 Заблокировано: ${total}`,
    `Страница ${safePage + 1} из ${totalPages}`,
    "",
    ...rendered.map((r) => r.line),
  ].join("\n");

  const keyboard: CbButton[][] = rendered.map((r) => [r.button]);

  const nav: CbButton[] = [];
  if (safePage > 0) {
    nav.push({ text: "‹ Назад", callback_data: `blocked:p=${safePage - 1}` });
  }
  if (safePage + 1 < totalPages) {
    nav.push({ text: "Вперёд ›", callback_data: `blocked:p=${safePage + 1}` });
  }
  if (nav.length) keyboard.push(nav);

  return { text, keyboard };
}

export const blockedList = async (ctx: MessageContext) => {
  if (!isAdmin(ctx.message.from.id)) {
    return;
  }

  const { text, keyboard } = await buildView(0);
  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
};

export const blockedListPage = async (ctx: ActionContext) => {
  const admin = ctx.from;
  if (!admin || !isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }

  const page = Number(ctx.match[1]);
  const { text, keyboard } = await buildView(page);

  try {
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch {
    // текст не изменился или сообщение устарело — игнорируем
  }
  await ctx.answerCbQuery();
};
