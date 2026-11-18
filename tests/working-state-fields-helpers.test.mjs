// U2 入力の欄の表（公開の補助の関数）: 行のデータ（working-state-field-rows-helpers.mjs）の 1 行ごとに、乱数らしい 64 文字を入れても写らないことを確かめる。
import { fieldTest } from "./working-state-field-fixtures.mjs";
import { HELPER_ROWS } from "./working-state-field-rows-helpers.mjs";

for (const row of HELPER_ROWS) fieldTest(row);
