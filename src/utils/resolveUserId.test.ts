import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveUserId } from "./resolveUserId";

// Покрываем «чистые» ветки, не требующие Redis: число и пустой ввод.
// Резолв @username бьёт в Redis и проверяется вручную/на стейдже.

test("resolveUserId: числовой id возвращается как есть", async () => {
  assert.equal(await resolveUserId("12345"), 12345);
  assert.equal(await resolveUserId("  777 "), 777);
});

test("resolveUserId: пустой/мусорный ввод -> null", async () => {
  assert.equal(await resolveUserId(""), null);
  assert.equal(await resolveUserId("   "), null);
  assert.equal(await resolveUserId("@"), null);
});
