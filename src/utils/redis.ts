import Redis from "ioredis";
import type { User } from "telegraf/types";

import { redisPrefix } from "../const";

export const redis = new Redis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  // lazyConnect — не открываем сокет при импорте модуля (важно для тестов и
  // быстрого старта); ioredis сам подключится при первой команде.
  { lazyConnect: true },
);

// Обратный индекс username -> id: один хэш, поле = username в нижнем регистре.
// Нужен, чтобы резолвить @username за O(1), а не сканом `keys user:*`.
const usernameIndexKey = `${redisPrefix}uname`;

export async function indexUsername(
  userId: number | string,
  username?: string | null,
) {
  if (!username) return;
  await redis.hset(usernameIndexKey, username.toLowerCase(), String(userId));
}

export async function lookupUsernameId(
  username: string,
): Promise<number | null> {
  const u = username.replace(/^@/, "").toLowerCase();
  if (!u) return null;
  const v = await redis.hget(usernameIndexKey, u);
  return v ? Number(v) : null;
}

export async function saveUserActivity(user: User) {
  if (!user?.id) return;

  const now = Date.now();

  await redis.hset(`${redisPrefix}user:${user.id}`, {
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    last_message: now,
  });

  await indexUsername(user.id, user.username);
}

export async function getUser(userId: number | string) {
  return redis.hgetall(`${redisPrefix}user:${userId}`);
}

export async function getAllActiveUserIds() {
  const keys = await redis.keys(`${redisPrefix}user:*`);
  return keys.map((k) => k.replace(`${redisPrefix}user:`, ""));
}

export async function saveUserField(
  userId: number,
  field: string,
  value: string,
) {
  const key = `${redisPrefix}user:${userId}`;
  await redis.hset(key, field, value);
}
