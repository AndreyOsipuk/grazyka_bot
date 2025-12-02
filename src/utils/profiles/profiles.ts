import { redisPrefix } from "../../const";
import { redis } from "../redis";

export type Profile = {
  gender: "m" | "f" | "x";
  age: number;
  city: string;
  about: string;
  created_at: number;
  updated_at: number;
};

const profileKey = (userId: number | string) =>
  `${redisPrefix}profile:${userId}`;

export async function saveProfile(
  userId: number,
  data: Omit<Profile, "created_at" | "updated_at">,
) {
  const key = profileKey(userId);
  const exists = await redis.exists(key);
  const now = Date.now();

  const payload: Profile = {
    ...data,
    created_at: exists
      ? Number((await redis.hget(key, "created_at")) || now)
      : now,
    updated_at: now,
  };

  await redis.hset(key, {
    gender: payload.gender,
    age: String(payload.age),
    city: payload.city,
    about: payload.about,
    created_at: String(payload.created_at),
    updated_at: String(payload.updated_at),
  });

  return payload;
}

export async function getProfile(
  userId: number | string,
): Promise<Profile | null> {
  const key = profileKey(userId);
  const raw = await redis.hgetall(key);
  if (!raw || !raw.gender) return null;

  return {
    gender: raw.gender as Profile["gender"],
    age: Number(raw.age || 0),
    city: raw.city || "",
    about: raw.about || "",
    created_at: Number(raw.created_at || 0),
    updated_at: Number(raw.updated_at || 0),
  };
}

export async function deleteProfile(userId: number | string) {
  await redis.del(profileKey(userId));
}

export async function getAllProfileUserIds(): Promise<string[]> {
  const pattern = `${redisPrefix}profile:*`;
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
      result.push(k.replace(`${redisPrefix}profile:`, ""));
    }
  } while (cursor !== "0");

  return result;
}
