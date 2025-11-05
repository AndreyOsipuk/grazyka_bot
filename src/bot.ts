import { config } from "dotenv";
import path from "path";
import { Telegraf } from "telegraf";
import pkg from "telegraf/filters";

const envPath = process.env.DOTENV_CONFIG_PATH || ".env";
config({ path: path.resolve(process.cwd(), envPath) });

import { appType } from "./const";
import { agreeRules } from "./handlers/agreeRules";
import { approveReject } from "./handlers/approveReject";
import { chatId } from "./handlers/chatid";
import { chatMessage } from "./handlers/chatMessage";
import { newChatMembers } from "./handlers/newChatMembers";
import { report } from "./handlers/report";
import { reset } from "./handlers/reset";
import { rules } from "./handlers/rules";
import { start } from "./handlers/start";
import { stats } from "./handlers/stats";
import { whois } from "./handlers/whois";
import { AppTypes } from "./types/types";
import { BOT_TOKEN } from "./utils";
import { launch } from "./utils/launch";
import { validate } from "./utils/validate";

validate();

console.log("🔑 BOT_TOKEN найден, создаём экземпляр бота...");
const bot = new Telegraf(BOT_TOKEN as string);

bot.start(start);

bot.command("rules", rules);
bot.command("whois", whois);
bot.command("chatid", chatId);
bot.command("reset", reset);
bot.command("stats", stats);

bot.action("agree_rules", async (ctx) => agreeRules(ctx, bot));

if (appType! == AppTypes.alco) {
  bot.action(/^(approve|reject)_(\d+)$/, approveReject);
  bot.on(pkg.message("new_chat_members"), newChatMembers as never);
}

bot.on("message", chatMessage);

bot.hears(/^report$/i, report);

await launch(bot);

// Корректное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
