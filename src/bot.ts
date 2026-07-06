import "dotenv/config";

import { Telegraf } from "telegraf";
import pkg from "telegraf/filters";

import { appType } from "./const";
import { agreeRules } from "./handlers/agreeRules";
import { APPROVE_REJECT_BAN_RE, approveReject } from "./handlers/approveReject";
import { ban, quickBan } from "./handlers/ban";
import { bannedList, bannedListPage } from "./handlers/banned";
import { chatId } from "./handlers/chatid";
import { chatMessage } from "./handlers/chatMessage";
import { help } from "./handlers/help";
import {
  memeBan,
  memeBannedList,
  memeBannedListPage,
  memeUnban,
  memeUnbanAction,
} from "./handlers/memeBan";
import { memeRepost } from "./handlers/memeRepost";
import { newChatMembers } from "./handlers/newChatMembers";
import { report } from "./handlers/report";
import { reset } from "./handlers/reset";
import { rules } from "./handlers/rules";
import { start } from "./handlers/start";
import { stats } from "./handlers/stats";
import { unban, unbanAction } from "./handlers/unban";
import { whois } from "./handlers/whois";
import { AppTypes } from "./types/types";
import { BOT_TOKEN } from "./utils";
import { startCleanupInactiveUsersCron } from "./utils/cleanupInactiveUsersCron";
import { launch } from "./utils/launch";
import { logCombotModeration } from "./utils/logCombotActions";
import { deleteProfileByAdmin } from "./utils/profiles/deleteProfileByAdmin";
import { findProfiles } from "./utils/profiles/findProfiles";
import { listWithoutProfiles } from "./utils/profiles/listWithoutProfiles";
import {
  handleProfileWizardMessage,
  showMyProfile,
  showUserProfile,
  startProfileWizard,
} from "./utils/profiles/profile";
import {
  profilesInlineFilter,
  profilesInlineStart,
} from "./utils/profiles/profilesInline";
import { reportClaim } from "./utils/reportClaim";
import { validate } from "./utils/validate";

validate();

console.log("🔑 BOT_TOKEN найден, создаём экземпляр бота...");
const bot = new Telegraf(BOT_TOKEN as string);

bot.start(start);

bot.command("help", help);
bot.command("rules", rules);
bot.command("whois", whois);
bot.command("chatid", chatId);
bot.command("reset", reset);
bot.command("stats", stats);
bot.command("report", report);
bot.command("anketa", startProfileWizard);
bot.command("myprofile", showMyProfile);
bot.command("noprof", listWithoutProfiles);
bot.command("find_profiles", findProfiles);
bot.command("delprofile", deleteProfileByAdmin);
bot.command("profile", showUserProfile);
bot.command("profiles", profilesInlineStart);
bot.command("ban", ban);
bot.command("unban", unban);
bot.command("banned", bannedList);
bot.command("memeban", memeBan);
bot.command("memeunban", memeUnban);
bot.command("memebanned", memeBannedList);

bot.action(/^profiles:/, profilesInlineFilter);
bot.action(/^banned:p=(\d+)$/, bannedListPage);
bot.action(/^unban_(\d+)$/, unbanAction);
bot.action(/^qban_(\d+)$/, quickBan);
bot.action(/^memebanned:p=(\d+)$/, memeBannedListPage);
bot.action(/^memeunban_(\d+)$/, memeUnbanAction);
bot.action("report_claim", reportClaim);
bot.action("agree_rules", async (ctx) => agreeRules(ctx, bot));

if (appType == AppTypes.gryzuka) {
  bot.action(APPROVE_REJECT_BAN_RE, approveReject);
}

bot.on(pkg.message("new_chat_members"), newChatMembers as never);
bot.on("message", async (ctx) => {
  await chatMessage(ctx);
  await memeRepost(ctx);
  await logCombotModeration(ctx);
});
bot.on(pkg.message("text"), handleProfileWizardMessage);

await launch(bot);

startCleanupInactiveUsersCron(bot, 60);

// Корректное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
