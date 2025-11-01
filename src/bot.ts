import "dotenv/config";

import { Telegraf } from "telegraf";
import pkg from "telegraf/filters";

import { agreeRules } from "./handlers/agreeRules";
import { approveReject } from "./handlers/approveReject";
import { chatId } from "./handlers/chatid";
import { chatMessage } from "./handlers/chatMessage";
import { newChatMembers } from "./handlers/newChatMembers";
import { report } from "./handlers/report";
import { reset } from "./handlers/reset";
import { start } from "./handlers/start";
import { whois } from "./handlers/whois";
import { BOT_TOKEN } from "./utils";
import { launch } from "./utils/launch";
import { validate } from "./utils/validate";

validate();

console.log("🔑 BOT_TOKEN найден, создаём экземпляр бота...");
const bot = new Telegraf(BOT_TOKEN as string);

bot.start(start);

bot.action("agree_rules", async (ctx) => agreeRules(ctx, bot));
bot.action(/^(approve|reject)_(\d+)$/, approveReject);

bot.on(pkg.message("new_chat_members"), newChatMembers as any);
bot.on("message", chatMessage);

bot.command("whois", whois);
bot.command("chatid", chatId);
bot.command("reset", reset);

bot.hears(/^report$/i, report);

await launch(bot);

// Корректное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
