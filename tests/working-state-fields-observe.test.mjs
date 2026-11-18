// U2 入力の欄の表（観測 observeAll の入口）: 行のデータ（working-state-field-rows-observe.mjs）の 1 行ごとに、乱数らしい 64 文字を入れても写らないことを確かめる。
import { fieldTest } from "./working-state-field-fixtures.mjs";
import { OBSERVE_ROWS } from "./working-state-field-rows-observe.mjs";

for (const row of OBSERVE_ROWS) fieldTest(row);
