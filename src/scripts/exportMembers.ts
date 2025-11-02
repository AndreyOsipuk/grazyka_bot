import "dotenv/config";

import fs from "fs";
import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

// === Типы окружения ===
const { API_ID, API_HASH, PHONE_NUMBER } = process.env as Record<
  string,
  string
>;

// === Проверки ===
if (!API_ID || !API_HASH || !PHONE_NUMBER) {
  console.error("❌ Отсутствуют обязательные переменные в .env");
  console.error(
    "Нужно указать API_ID, API_HASH, PHONE_NUMBER и GROUP_URL.\n" +
      "👉 Получить можно на https://my.telegram.org",
  );
  process.exit(1);
}

// === Константы ===
const sessionPath = "./.session.txt";
const membersPath = "./members.json";

// === Чтение существующей сессии (если есть) ===
const sessionStr = fs.existsSync(sessionPath)
  ? fs.readFileSync(sessionPath, "utf8")
  : "";
const stringSession = new StringSession(sessionStr);

async function main() {
  const apiId = parseInt(API_ID, 10);
  const apiHash = API_HASH;

  console.log("📱 Подключаемся к Telegram API...");

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () =>
      PHONE_NUMBER || (await input.text("Введите номер: ")),
    password: async () => await input.text("Введите пароль (если есть 2FA): "),
    phoneCode: async () => await input.text("Введите код из Telegram: "),
    onError: (err) => console.error("Ошибка авторизации:", err),
  });

  console.log("✅ Авторизация прошла успешно!");

  // Сохраняем сессию для повторных запусков
  const newSession = client.session.save() as unknown as string;
  fs.writeFileSync(sessionPath, newSession, "utf8");
  console.log("💾 Сессия сохранена в .session.txt");

  // === Получаем участников ===
  const entity = await client.getEntity(Number(process.env.GROUP_ID!));

  const chatName =
    "title" in entity ? entity.title : Number(process.env.GROUP_ID!);

  console.log(`👥 Получаем участников чата: ${chatName}`);

  const allMembers: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  }[] = [];

  for await (const user of client.iterParticipants(entity)) {
    if (user.bot) continue;
    allMembers.push({
      id: Number(user.id),
      username: user.username || undefined,
      first_name: user.firstName || undefined,
      last_name: user.lastName || undefined,
    });
  }

  fs.writeFileSync(membersPath, JSON.stringify(allMembers, null, 2));
  console.log(`✅ Сохранено ${allMembers.length} участников в ${membersPath}`);

  await client.disconnect();
  console.log("🔌 Соединение закрыто");
}

main().catch((err) => {
  console.error("❌ Ошибка выполнения:", err);
});
