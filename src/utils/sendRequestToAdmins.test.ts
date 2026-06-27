import assert from "node:assert/strict";
import { test } from "node:test";

import type { InlineKeyboardButton } from "telegraf/types";

import { buildAdminKeyboard } from "./sendRequestToAdmins";

type CbButton = InlineKeyboardButton.CallbackButton;

test("карточка запроса: три кнопки в двух рядах", () => {
  const rows = buildAdminKeyboard(123).reply_markup.inline_keyboard;

  assert.equal(rows.length, 2, "должно быть два ряда");
  assert.equal(rows[0].length, 2, "первый ряд: Одобрить + Отклонить");
  assert.equal(rows[1].length, 1, "второй ряд: Забанить");
});

test("кнопки несут правильные callback_data с id пользователя", () => {
  const flat = buildAdminKeyboard(
    777,
  ).reply_markup.inline_keyboard.flat() as CbButton[];
  const byData = Object.fromEntries(flat.map((b) => [b.callback_data, b.text]));

  assert.equal(byData["approve_777"], "✅ Одобрить");
  assert.equal(byData["reject_777"], "❌ Отклонить");
  assert.equal(byData["ban_777"], "🚫 Забанить");
});

test("кнопка бана присутствует ровно одна", () => {
  const flat = buildAdminKeyboard(
    5,
  ).reply_markup.inline_keyboard.flat() as CbButton[];
  const banBtns = flat.filter((b) =>
    String(b.callback_data).startsWith("ban_"),
  );

  assert.equal(banBtns.length, 1);
});
