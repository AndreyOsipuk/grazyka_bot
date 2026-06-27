import { findBlockedByUsername } from "./blocked";
import { findUserIdByUsername } from "./profiles/findUserIdByUsername";
import { lookupUsernameId } from "./redis";

// Единый резолвер: число -> это id; @username -> ищем id.
// Порядок: индекс username->id (O(1)) -> реестр забаненных -> легаси-скан
// по user:* (на случай, когда индекс ещё не прогрет для старых юзеров).
// Bot API не резолвит произвольный @username, поэтому опираемся на свои данные.
export async function resolveUserId(arg: string): Promise<number | null> {
  const t = (arg || "").trim();
  if (!t) return null;

  if (/^\d+$/.test(t)) return Number(t);

  const uname = t.replace(/^@/, "");
  if (!uname) return null;

  const fromIndex = await lookupUsernameId(uname);
  if (fromIndex) return fromIndex;

  const fromBanned = await findBlockedByUsername(uname);
  if (fromBanned) return Number(fromBanned.id);

  const fromActivity = await findUserIdByUsername(uname);
  return fromActivity?.id ?? null;
}
