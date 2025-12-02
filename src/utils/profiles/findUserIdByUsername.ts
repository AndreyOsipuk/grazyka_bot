// utils/profiles/findUserIdByUsername.ts
import { redisPrefix } from "../../const";
import { redis } from "../redis";

export async function findUserIdByUsername(usernameOrId: string) {
  const t = usernameOrId.replace("@", "").toLowerCase();

  // если это числовой ID — возвращаем объект
  if (/^\d+$/.test(t)) {
    const user = await redis.hgetall(`${redisPrefix}user:${t}`);
    if (!user) return null;

    return {
      id: Number(t),
      username: user.username || null,
      first_name: user.first_name || null,
    };
  }

  // иначе ищем по username
  const keys = await redis.keys(`${redisPrefix}user:*`);
  for (const key of keys) {
    const data = await redis.hgetall(key);
    if (data.username?.toLowerCase() === t) {
      const id = Number(key.replace(`${redisPrefix}user:`, ""));
      return {
        id,
        username: data.username,
        first_name: data.first_name || null,
      };
    }
  }

  return null;
}
