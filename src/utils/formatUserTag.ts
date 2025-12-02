import { escapeHtml } from "./index";

export function formatUserTag(userId: string | number, user: any) {
  const id = String(userId);

  // 1) Есть username → возвращаем @username
  if (user?.username) {
    return `@${user.username}`;
  }

  // 2) Есть first_name → кликабельное имя
  if (user?.first_name) {
    const name = escapeHtml(user.first_name);
    return `<a href="tg://user?id=${id}">${name}</a>`;
  }

  // 3) Нет ничего → показываем кликабельный ID
  return `<a href="tg://user?id=${id}">${id}</a>`;
}
