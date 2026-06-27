import assert from "node:assert/strict";
import { test } from "node:test";

import { paginate } from "./blocked";

test("paginate: первая страница и total", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  const r = paginate(items, 20, 0);

  assert.equal(r.total, 25);
  assert.deepEqual(r.data, items.slice(0, 20));
});

test("paginate: вторая страница через offset", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  const r = paginate(items, 20, 20);

  assert.deepEqual(r.data, [20, 21, 22, 23, 24]);
});

test("paginate: limit зажат сверху 100 и снизу 1", () => {
  const items = Array.from({ length: 250 }, (_, i) => i);

  assert.equal(paginate(items, 1000, 0).data.length, 100);
  assert.equal(paginate(items, 0, 0).data.length, 1);
});

test("paginate: отрицательный offset не ломает выборку", () => {
  const r = paginate([1, 2, 3], 20, -5);
  assert.deepEqual(r.data, [1, 2, 3]);
});

test("paginate: пустой список", () => {
  const r = paginate([], 20, 0);
  assert.equal(r.total, 0);
  assert.deepEqual(r.data, []);
});
