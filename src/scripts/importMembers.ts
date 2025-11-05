import "dotenv/config";

import * as fs from "fs";
import * as path from "path";

import { redisPrefix } from "../const";
import { redis } from "../utils/redis.js";

async function main() {
  const filePath = path.resolve("./members.json");
  if (!fs.existsSync(filePath)) {
    console.error("❌ Файл members.json не найден рядом со скриптом");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let count = 0;

  console.log(`📦 Найдено ${data.length} участников, импортируем в Redis...`);

  const now = Date.now();
  const offset = 4 * 7 * 24 * 3600 * 1000; // 4 недели назад

  for (const member of data) {
    if (!member.id) continue;
    await redis.hset(`${redisPrefix}user:${member.id}`, {
      username: member.username || "",
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      last_message: (now - offset).toString(),
    });
    count++;
  }

  console.log(`✅ Импортировано ${count} участников (фиктивно 4 недели назад)`);

  await redis.quit();
  console.log("🔌 Соединение с Redis закрыто");
}

main().catch((err) => {
  console.error("❌ Ошибка при импорте:", err);
  process.exit(1);
});
