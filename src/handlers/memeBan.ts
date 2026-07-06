import type { InlineKeyboardButton } from "telegraf/types";

import type { ActionContext, MessageContext } from "../types/types";
import { escapeHtml, isAdmin } from "../utils";
import { formatUserTag } from "../utils/formatUserTag";
import {
  listMemeBanned,
  type MemeBanListItem,
  memeBanUser,
  memeUnbanUser,
} from "../utils/memeBan";
import { resolveBanTarget } from "./ban";

type CbButton = InlineKeyboardButton.CallbackButton;
const PAGE_SIZE = 20;

export const memeBan = async (ctx: MessageContext) => {
  const admin = ctx.message.from;
  if (!isAdmin(admin.id)) return;

  const reply = ctx.message?.reply_to_message;
  const arg = (ctx.message?.text || "").split(/\s+/)[1]?.trim();
  const { userId, info } = await resolveBanTarget(ctx, reply, arg);

  if (!userId) {
    return ctx.reply(
      [
        "Использование:",
        "• Ответьте /memeban на мем пользователя",
        "• или /memeban &lt;user_id&gt; / @username",
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  }

  await memeBanUser(userId, {
    ...info,
    banned_by: admin.first_name || String(admin.id),
  });

  await ctx.reply(
    `🚫 Пользователь <code>${userId}</code> больше не может отправлять мемы в канал.`,
    { parse_mode: "HTML" },
  );
};

export const memeUnban = async (ctx: MessageContext) => {
  const admin = ctx.message.from;
  if (!isAdmin(admin.id)) return;

  const reply = ctx.message?.reply_to_message;
  const arg = (ctx.message?.text || "").split(/\s+/)[1]?.trim();
  const { userId } = await resolveBanTarget(ctx, reply, arg);

  if (!userId) {
    return ctx.reply(
      [
        "Использование:",
        "• Ответьте /memeunban на сообщение пользователя",
        "• или /memeunban &lt;user_id&gt; / @username",
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  }

  await memeUnbanUser(userId);
  await ctx.reply(
    `✅ Пользователю <code>${userId}</code> снова можно отправлять мемы.`,
    { parse_mode: "HTML" },
  );
};

function renderItem(b: MemeBanListItem): { line: string; button: CbButton } {
  const tag = formatUserTag(b.id, b);
  const when = b.banned_at
    ? new Date(b.banned_at).toLocaleDateString("ru-RU")
    : "—";
  const by = b.banned_by ? escapeHtml(b.banned_by) : "—";
  return {
    line: `• ${tag} — <code>${b.id}</code>, ${when}, кем: ${by}`,
    button: {
      text: `Разбанить мемы ${b.username ? "@" + b.username : b.id}`,
      callback_data: `memeunban_${b.id}`,
    },
  };
}

async function buildView(page: number) {
  const safePage = Math.max(0, page);
  const { data, total } = await listMemeBanned(PAGE_SIZE, safePage * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (total === 0) {
    return {
      text: "✅ По мемам никто не забанен.",
      keyboard: [] as CbButton[][],
    };
  }

  const rendered = data.map(renderItem);
  const text = [
    `🚫 Забанено по мемам: ${total}`,
    `Страница ${safePage + 1} из ${totalPages}`,
    "",
    ...rendered.map((r) => r.line),
  ].join("\n");

  const keyboard: CbButton[][] = rendered.map((r) => [r.button]);
  const nav: CbButton[] = [];
  if (safePage > 0) {
    nav.push({
      text: "‹ Назад",
      callback_data: `memebanned:p=${safePage - 1}`,
    });
  }
  if (safePage + 1 < totalPages) {
    nav.push({
      text: "Вперёд ›",
      callback_data: `memebanned:p=${safePage + 1}`,
    });
  }
  if (nav.length) keyboard.push(nav);

  return { text, keyboard };
}

export const memeBannedList = async (ctx: MessageContext) => {
  if (!isAdmin(ctx.message.from.id)) return;
  const { text, keyboard } = await buildView(0);
  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
};

export const memeBannedListPage = async (ctx: ActionContext) => {
  const admin = ctx.from;
  if (!admin || !isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }
  const { text, keyboard } = await buildView(Number(ctx.match[1]));
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

export const memeUnbanAction = async (ctx: ActionContext) => {
  const admin = ctx.from;
  if (!admin || !isAdmin(admin.id)) {
    return ctx.answerCbQuery("❌ У вас нет прав для этого действия!", {
      show_alert: true,
    });
  }
  const targetId = Number(ctx.match[1]);
  await memeUnbanUser(targetId);
  await ctx.answerCbQuery("Разбанен по мемам");
  try {
    await ctx.editMessageReplyMarkup(undefined);
  } catch {
    // разметку могли уже убрать — не критично
  }
};
