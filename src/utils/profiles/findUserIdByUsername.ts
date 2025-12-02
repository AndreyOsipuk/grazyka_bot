import { getAllActiveUserIds, getUser } from "../redis";

export async function findUserIdByUsername(
  usernameOrId: string,
): Promise<string | null> {
  const username = usernameOrId.replace("@", "").toLowerCase();

  // Если это чисто цифры — считаем, что это уже ID
  if (/^\d+$/.test(usernameOrId)) {
    return usernameOrId;
  }

  const ids = await getAllActiveUserIds();
  for (const id of ids) {
    const u = await getUser(id);
    if (u?.username?.toLowerCase() === username) {
      return id;
    }
  }

  return null;
}
