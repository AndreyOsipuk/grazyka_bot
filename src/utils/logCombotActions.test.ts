import assert from "node:assert/strict";
import { test } from "node:test";

import { buildModerationLogText } from "./logCombotActions";

const base = {
  adminMention: "@osandr",
  command: "!warn",
  targetMention: "@AleksandrFirs",
};

test("лог админского действия: есть ссылка на сообщение", () => {
  const text = buildModerationLogText({
    ...base,
    link: "https://t.me/c/2911005935/123",
  });

  assert.match(text, /👮 Админ: @osandr/);
  assert.match(text, /💬 Команда: <code>!warn<\/code>/);
  assert.match(text, /🎯 Цель: @AleksandrFirs/);
  assert.match(
    text,
    /🔗 <a href="https:\/\/t\.me\/c\/2911005935\/123">Перейти к сообщению<\/a>/,
  );
});

test("лог админского действия: без ссылки строки «Перейти» нет", () => {
  const text = buildModerationLogText({ ...base, link: "" });
  assert.doesNotMatch(text, /Перейти к сообщению/);
});

test("лог админского действия: команда экранируется", () => {
  const text = buildModerationLogText({
    ...base,
    command: "!warn<b>",
    link: "",
  });
  assert.match(text, /<code>!warn&lt;b&gt;<\/code>/);
});
