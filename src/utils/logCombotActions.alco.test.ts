import assert from "node:assert/strict";
import { test } from "node:test";

import type { Context } from "telegraf";

// Конфиг как у алкобота: отдельного админ-чата нет, ADMIN_GROUP_ID = сам чат.
// Env выставляем до импорта модуля — он читает его при загрузке.
process.env.GROUP_ID = "-1001319384801";
process.env.ADMIN_GROUP_ID = "-1001319384801";
process.env.ADMIN_IDS = "408715770";

test("алко: !warn админа НЕ дублируется логом в общий чат", async () => {
  const { logCombotModeration } = await import("./logCombotActions");
  const sent: unknown[] = [];

  const ctx = {
    chat: { id: -1001319384801 },
    from: { id: 408715770, username: "osandr", first_name: "A" },
    message: {
      message_id: 10,
      text: "!warn",
      reply_to_message: {
        message_id: 9,
        from: { id: 555, username: "AleksandrFirs", first_name: "S" },
      },
    },
    telegram: { sendMessage: async (...args: unknown[]) => sent.push(args) },
  } as unknown as Context;

  await logCombotModeration(ctx);

  assert.equal(sent.length, 0);
});
