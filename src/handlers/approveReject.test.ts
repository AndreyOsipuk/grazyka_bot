import assert from "node:assert/strict";
import { test } from "node:test";

import { APPROVE_REJECT_BAN_RE } from "./approveReject";

test("регекс роутит все три кнопки и достаёт id", () => {
  for (const action of ["approve", "reject", "ban"]) {
    const m = APPROVE_REJECT_BAN_RE.exec(`${action}_42`);
    assert.ok(m, `${action} должен матчиться`);
    assert.equal(m![1], action);
    assert.equal(m![2], "42");
  }
});

test("регекс отвергает некорректные callback_data", () => {
  for (const bad of [
    "ban_",
    "ban_abc",
    "block_1",
    "approve_1_2",
    "ban 1",
    "unban_1",
  ]) {
    assert.equal(
      APPROVE_REJECT_BAN_RE.test(bad),
      false,
      `${bad} не должен матчиться`,
    );
  }
});
