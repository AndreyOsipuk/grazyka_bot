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
