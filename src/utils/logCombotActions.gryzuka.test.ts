import assert from "node:assert/strict";
import { test } from "node:test";

import type { Context } from "telegraf";

// Конфиг как у грязюки: отдельный админ-чат. Env выставляем до импорта модуля.
process.env.GROUP_ID = "-1002911005935";
process.env.ADMIN_GROUP_ID = "-1003135171437";
process.env.ADMIN_IDS = "408715770";

test("грязюка: !warn логируется в админ-чат со ссылкой на сообщение нарушителя", async () => {
  const { logCombotModeration } = await import("./logCombotActions");
  const sent: [number, string][] = [];

  const ctx = {
    chat: { id: -1002911005935 },
    from: { id: 408715770, username: "osandr", first_name: "A" },
    message: {
      message_id: 10,
      text: "!warn",
      reply_to_message: {
        message_id: 9,
        from: { id: 555, username: "AleksandrFirs", first_name: "S" },
      },
    },
    telegram: {
      sendMessage: async (chatId: number, text: string) =>
        sent.push([chatId, text]),
    },
  } as unknown as Context;

  await logCombotModeration(ctx);

  assert.equal(sent.length, 1);
  const [chatId, text] = sent[0];
  assert.equal(chatId, -1003135171437);
  assert.match(text, /🎯 Цель: @AleksandrFirs/);
  assert.match(text, /href="https:\/\/t\.me\/c\/2911005935\/9"/);
});
