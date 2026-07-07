import { redisPrefix } from "../const";
import type { UserRequest } from "../types/types";
import { redis } from "./redis";

// Заявки на вступление раньше жили только в памяти (Map) и терялись при каждом
// рестарте бота — из-за этого «Одобрить» на старой карточке падал с «запрос
// устарел». Дублируем заявку в Redis, чтобы решение переживало рестарт.

const reqKey = (userId: number | string) => `${redisPrefix}req:${userId}`;
// TTL, чтобы незавершённые заявки не копились вечно.
const REQUEST_TTL_SEC = 30 * 24 * 3600; // 30 дней

export async function saveRequest(
  userId: number,
  data: UserRequest,
): Promise<void> {
  await redis.set(reqKey(userId), JSON.stringify(data), "EX", REQUEST_TTL_SEC);
}

export async function getRequest(
  userId: number | string,
): Promise<UserRequest | null> {
  const raw = await redis.get(reqKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserRequest;
  } catch {
    return null;
  }
}

export async function deleteRequest(userId: number | string): Promise<void> {
  await redis.del(reqKey(userId));
}
