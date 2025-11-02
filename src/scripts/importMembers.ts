import fs from "fs";
import path from "path";

import type { ActionContext } from "../types/types";
import { isAdmin } from "../utils";
import { redis } from "../utils/redis";

export async function importMembers(ctx: ActionContext) {
  const admin = ctx.from;

  if (!isAdmin(admin.id)) {
    return ctx.reply("🚫 Только админы могут импортировать участников");
  }

  const filePath = path.resolve("../../members.json");
  if (!fs.existsSync(filePath)) {
    return ctx.reply("❌ Файл members.json не найден рядом с ботом");
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let count = 0;

  for (const member of data) {
    if (!member.id) continue;
    await redis.hset(`user:${member.id}`, {
      username: member.username || "",
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      last_message: Date.now() - 90 * 24 * 3600 * 1000, // фиктивно 90 дней назад
    });
    await redis.sadd("active_users", member.id.toString());
    count++;
  }

  await ctx.reply(`✅ Импортировано ${count} участников в Redis`);
}
