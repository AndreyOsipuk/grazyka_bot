import { MEME_TAG } from "./index";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Тег как отдельный хэштег: #мем ловим, #мемный — нет (после тега не должно
// идти буквы/цифры/подчёркивания). Регистронезависимо, с поддержкой кириллицы.
const tagBody = MEME_TAG.replace(/^#/, "");
const tagPattern = "#" + escapeRe(tagBody) + "(?![\\p{L}\\p{N}_])";

export function hasMemeTag(text: string): boolean {
  if (!text) return false;
  return new RegExp(tagPattern, "iu").test(text);
}

// Убирает тег из подписи, схлопывает лишние пробелы.
export function stripMemeTag(text: string): string {
  if (!text) return "";
  return text
    .replace(new RegExp(tagPattern, "giu"), "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Команда-ответ "мем" (или "#мем" / "/мем") в начале сообщения. Всё, что идёт
// после неё — необязательная подпись для поста в канале. "мемный" не срабатывает.
const memeCommandRe = /^\s*(?:[#/])?мем(?![\p{L}\p{N}_])\s*/iu;

export function parseMemeCommand(text: string): {
  isMeme: boolean;
  caption: string;
} {
  if (!text) return { isMeme: false, caption: "" };
  const m = memeCommandRe.exec(text);
  if (!m) return { isMeme: false, caption: "" };
  return { isMeme: true, caption: text.slice(m[0].length).trim() };
}
