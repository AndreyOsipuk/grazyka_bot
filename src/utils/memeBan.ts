import { redisPrefix } from "../const";
import { paginate } from "./blocked";
import { indexUsername, redis } from "./redis";

export type MemeBan = {
  first_name: string;
  last_name: string;
  username: string;
  banned_at: number;
  banned_by: string;
};

const memeBanKey = (userId: number | string) =>
  `${redisPrefix}memeban:${userId}`;

export async function memeBanUser(
  userId: number,
  data: {
    first_name?: string;
    last_name?: string;
    username?: string;
    banned_by: string;
    banned_at?: number;
  },
): Promise<void> {
  await redis.hset(memeBanKey(userId), {
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    username: data.username || "",
    banned_at: String(data.banned_at ?? Date.now()),
    banned_by: data.banned_by || "",
  });
  // чтобы /memeunban @username работал по индексу
  await indexUsername(userId, data.username);
}

export async function memeUnbanUser(userId: number | string): Promise<void> {
  await redis.del(memeBanKey(userId));
}

export async function isMemeBanned(userId: number | string): Promise<boolean> {
  return (await redis.exists(memeBanKey(userId))) === 1;
}

export async function getMemeBan(
  userId: number | string,
): Promise<MemeBan | null> {
  const raw = await redis.hgetall(memeBanKey(userId));
  if (!raw || Object.keys(raw).length === 0) return null;
  return {
    first_name: raw.first_name || "",
    last_name: raw.last_name || "",
    username: raw.username || "",
    banned_at: Number(raw.banned_at || 0),
    banned_by: raw.banned_by || "",
  };
}

async function getAllMemeBannedIds(): Promise<string[]> {
  const pattern = `${redisPrefix}memeban:*`;
  let cursor = "0";
  const result: string[] = [];
  do {
    const [next, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      1000,
    );
    cursor = next;
    for (const k of keys) {
      result.push(k.replace(`${redisPrefix}memeban:`, ""));
    }
  } while (cursor !== "0");
  return result;
}

export type MemeBanListItem = MemeBan & { id: string };

export async function listMemeBanned(
  limit = 20,
  offset = 0,
): Promise<{ data: MemeBanListItem[]; total: number }> {
  const ids = (await getAllMemeBannedIds()).sort();
  const { data: pageIds, total } = paginate(ids, limit, offset);
  const data: MemeBanListItem[] = [];
  for (const id of pageIds) {
    const b = await getMemeBan(id);
    if (b) data.push({ ...b, id });
  }
  return { data, total };
}
