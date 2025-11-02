import Redis from "ioredis";

export const redis = new Redis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
);

export async function saveUserActivity(user: any) {
  if (!user?.id) return;

  const now = Date.now();

  await redis.hset(`user:${user.id}`, {
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    last_message: now,
  });

  await redis.sadd("active_users", user.id.toString());
}

export async function getAllActiveUserIds() {
  return redis.smembers("active_users");
}
