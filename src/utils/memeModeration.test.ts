import assert from "node:assert/strict";
import { test } from "node:test";

import type { InlineKeyboardButton } from "telegraf/types";

import {
  buildChatMessageLink,
  buildMemeModKeyboard,
  parseMemeModData,
} from "./memeModeration";

type CbButton = InlineKeyboardButton.CallbackButton;
type UrlButton = InlineKeyboardButton.UrlButton;

const CHAT = -1002911005935;

test("карточка модерации: Одобрить и Отклонить с id мема, автора и статуса", () => {
  const rows = buildMemeModKeyboard(CHAT, 4321, 6198242353, 4322);
  const [approve, reject] = rows[0] as CbButton[];

  assert.equal(approve.text, "✅ Одобрить");
  assert.equal(approve.callback_data, "mmok_4321_6198242353_4322");
  assert.equal(reject.text, "❌ Отклонить");
  assert.equal(reject.callback_data, "mmno_4321_6198242353_4322");
});

test("карточка модерации: кнопка «Открыть в чате» ведёт на сам мем", () => {
  const rows = buildMemeModKeyboard(CHAT, 4321, 1, 4322);
  const [open] = rows[1] as UrlButton[];

  assert.equal(open.text, "Открыть в чате");
  assert.equal(open.url, "https://t.me/c/2911005935/4321");
});

test("callback_data влезает в лимит Telegram 64 байта на больших id", () => {
  const rows = buildMemeModKeyboard(CHAT, 2147483647, 9999999999, 2147483647);
  for (const b of rows[0] as CbButton[]) {
    assert.ok(Buffer.byteLength(b.callback_data) <= 64, b.callback_data);
  }
});

test("parseMemeModData: одобрение и отказ разбираются в обе стороны", () => {
  assert.deepEqual(parseMemeModData("mmok_4321_6198242353_4322"), {
    approve: true,
    memeMsgId: 4321,
    authorId: 6198242353,
    statusMsgId: 4322,
  });
  assert.equal(parseMemeModData("mmno_1_2_3")?.approve, false);
});

test("parseMemeModData: чужие и битые callback_data отвергаются", () => {
  for (const bad of [
    "mmok_1_2",
    "mmyes_1_2_3",
    "sugok_1_2",
    "mmok_a_2_3",
    "mmok_1_2_3_4",
    "",
  ]) {
    assert.equal(parseMemeModData(bad), null, bad);
  }
});

test("buildChatMessageLink: только для супергрупп -100…", () => {
  assert.equal(
    buildChatMessageLink(-1001319384801, 7),
    "https://t.me/c/1319384801/7",
  );
  assert.equal(buildChatMessageLink(123456, 7), "");
  assert.equal(buildChatMessageLink(-123456, 7), "");
});
