// U2 入力の欄の表（判定・写しの関数を直接呼ぶ入口）: 行のデータ（working-state-field-rows-checks.mjs）の 1 行ごとに、乱数らしい 64 文字を入れても写らないことを確かめる。
import { fieldTest } from "./working-state-field-fixtures.mjs";
import { CHECK_ROWS } from "./working-state-field-rows-checks.mjs";

for (const row of CHECK_ROWS) fieldTest(row);
