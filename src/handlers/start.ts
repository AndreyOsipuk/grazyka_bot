import fs from "fs";
import path from "path";
import type { Context } from "telegraf";
import { Markup } from "telegraf";
import { fileURLToPath } from "url";

import { userInviteLinks, userRequests } from "../core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rulesText = fs
  .readFileSync(path.resolve(__dirname, "../rules.txt"), "utf8")
  .trim();

export const start = async (ctx: Context) => {
  const user = ctx.from;
  const chat = ctx.chat;

  if (!user) return;
  if (!chat || chat.type !== "private") return;

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
};
