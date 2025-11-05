import Redis from "ioredis";
import type { User } from "telegraf/types";

import { redisPrefix } from "../const";

export const redis = new Redis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
);

export async function saveUserActivity(user: User) {
  if (!user?.id) return;

  const now = Date.now();

  await redis.hset(`${redisPrefix}user:${user.id}`, {
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    last_message: now,
  });
}

export async function getUser(userId: number | string) {
  return redis.hgetall(`${redisPrefix}user:${userId}`);
}

export async function getAllActiveUserIds() {
  const keys = await redis.keys(`${redisPrefix}user:*`);
  return keys.map((k) => k.replace(`${redisPrefix}user:`, ""));
}
