import { redisPrefix } from "../const";
import { redis } from "./redis";

export type Blocked = {
  first_name: string;
  last_name: string;
  username: string;
  blocked_at: number;
  blocked_by: string;
};

// Сообщение, которое получает заблокированный пользователь (при блокировке
// и при любой повторной попытке вступить).
export const BLOCKED_USER_MESSAGE =
  "⛔️ Вы заблокированы администратором и больше не можете отправлять запросы на вступление.\n\n" +
  "Если считаете, что это ошибка - свяжитесь с поддержкой.";

const blockedKey = (userId: number | string) =>
  `${redisPrefix}blocked:${userId}`;

export async function blockUser(
  userId: number,
  data: Omit<Blocked, "blocked_at"> & { blocked_at?: number },
): Promise<void> {
  await redis.hset(blockedKey(userId), {
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    username: data.username || "",
    blocked_at: String(data.blocked_at ?? Date.now()),
    blocked_by: data.blocked_by || "",
  });
}

export async function unblockUser(userId: number | string): Promise<void> {
  await redis.del(blockedKey(userId));
}

export async function getBlocked(
  userId: number | string,
): Promise<Blocked | null> {
  const raw = await redis.hgetall(blockedKey(userId));
  if (!raw || Object.keys(raw).length === 0) return null;

  return {
    first_name: raw.first_name || "",
    last_name: raw.last_name || "",
    username: raw.username || "",
    blocked_at: Number(raw.blocked_at || 0),
    blocked_by: raw.blocked_by || "",
  };
}

async function getAllBlockedUserIds(): Promise<string[]> {
  const pattern = `${redisPrefix}blocked:*`;
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
      result.push(k.replace(`${redisPrefix}blocked:`, ""));
    }
  } while (cursor !== "0");

  return result;
}

// Чистая пагинация — выделена отдельно, чтобы покрыть тестом без Redis.
export function paginate<T>(
  items: T[],
  limit: number,
  offset: number,
): { data: T[]; total: number } {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safeOffset = Math.max(0, offset);
  return {
    data: items.slice(safeOffset, safeOffset + safeLimit),
    total: items.length,
  };
}

export type BlockedListItem = Blocked & { id: string };

export async function listBlocked(
  limit = 20,
  offset = 0,
): Promise<{ data: BlockedListItem[]; total: number }> {
  const ids = (await getAllBlockedUserIds()).sort();
  const { data: pageIds, total } = paginate(ids, limit, offset);

  const data: BlockedListItem[] = [];
  for (const id of pageIds) {
    const b = await getBlocked(id);
    if (b) data.push({ ...b, id });
  }

  return { data, total };
}
