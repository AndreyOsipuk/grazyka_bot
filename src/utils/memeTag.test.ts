import assert from "node:assert/strict";
import { test } from "node:test";

import { hasMemeTag, parseMemeCommand, stripMemeTag } from "./memeTag";

test("hasMemeTag: ловит тег в разных позициях и регистрах", () => {
  assert.equal(hasMemeTag("#мем"), true);
  assert.equal(hasMemeTag("топовый #мем"), true);
  assert.equal(hasMemeTag("#Мем сверху"), true);
  assert.equal(hasMemeTag("#МЕМ"), true);
  assert.equal(hasMemeTag("#мем!"), true);
  assert.equal(hasMemeTag("а\n#мем\nб"), true);
});

test("hasMemeTag: НЕ ловит часть слова и мусор", () => {
  assert.equal(hasMemeTag("#мемный"), false);
  assert.equal(hasMemeTag("#мемас"), false);
  assert.equal(hasMemeTag("мем без решётки"), false);
  assert.equal(hasMemeTag(""), false);
  assert.equal(hasMemeTag("просто текст"), false);
});

test("stripMemeTag: убирает тег, чистит пробелы", () => {
  assert.equal(stripMemeTag("топ #мем"), "топ");
  assert.equal(stripMemeTag("#мем"), "");
  assert.equal(stripMemeTag("до #мем после"), "до после");
  assert.equal(stripMemeTag("#мем в начале"), "в начале");
});

test("stripMemeTag: не трогает похожие слова", () => {
  assert.equal(stripMemeTag("это #мемный контент"), "это #мемный контент");
});

test("parseMemeCommand: ловит команду и достаёт подпись", () => {
  assert.deepEqual(parseMemeCommand("мем"), { isMeme: true, caption: "" });
  assert.deepEqual(parseMemeCommand("мем смешная подпись"), {
    isMeme: true,
    caption: "смешная подпись",
  });
  assert.deepEqual(parseMemeCommand("#мем"), { isMeme: true, caption: "" });
  assert.deepEqual(parseMemeCommand("/мем топ"), {
    isMeme: true,
    caption: "топ",
  });
  assert.deepEqual(parseMemeCommand("МЕМ TOP"), {
    isMeme: true,
    caption: "TOP",
  });
});

test("parseMemeCommand: не срабатывает на похожем/постороннем", () => {
  assert.equal(parseMemeCommand("мемный").isMeme, false);
  assert.equal(parseMemeCommand("это мем").isMeme, false);
  assert.equal(parseMemeCommand("").isMeme, false);
  assert.equal(parseMemeCommand("привет").isMeme, false);
});
