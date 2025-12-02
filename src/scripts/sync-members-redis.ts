// scripts/sync-members-redis.ts
import "dotenv/config";

import * as fs from "fs";
import * as path from "path";

import { redisPrefix } from "../const";
import { redis } from "../utils/redis.js";

type Member = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

async function main() {
  const filePath = path.resolve(`./${redisPrefix}members.json`);
  if (!fs.existsSync(filePath)) {
    console.error("❌ Файл members.json не найден рядом со скриптом");
    process.exit(1);
  }

  const data: Member[] = JSON.parse(fs.readFileSync(filePath, "utf8"));

  console.log(`👥 В файле участников: ${data.length}`);

  // 1. Собираем множество актуальных ID из members.json
  const memberIds = new Set<string>(data.map((m) => String(m.id)));

  // 2. Проходим по ключам в Redis и ищем user:* которых нет в memberIds
  const pattern = `${redisPrefix}user:*`;
  let cursor = "0";
  const keysToDelete: string[] = [];
  let totalKeys = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      1000,
    );
    cursor = nextCursor;

    totalKeys += keys.length;

    for (const key of keys) {
      const userId = key.replace(`${redisPrefix}user:`, "");
      if (!memberIds.has(userId)) {
        keysToDelete.push(key);
      }
    }
  } while (cursor !== "0");

  console.log(`🔎 Всего ключей пользователей в Redis: ${totalKeys}`);
  console.log(
    `🧹 Пользователей, которых нет в текущем members.json: ${keysToDelete.length}`,
  );

  // 3. Удаляем лишних
  if (keysToDelete.length > 0) {
    // redis.del может принимать несколько ключей
    // но если их очень много — лучше бить на чанки
    const chunkSize = 500;
    for (let i = 0; i < keysToDelete.length; i += chunkSize) {
      const chunk = keysToDelete.slice(i, i + chunkSize);
      await redis.del(...chunk);
    }
  }

  console.log("✅ Лишние пользователи из Redis удалены");

  await redis.quit();
  console.log("🔌 Соединение с Redis закрыто");
}

main().catch((err) => {
  console.error("❌ Ошибка при синхронизации:", err);
  process.exit(1);
});
